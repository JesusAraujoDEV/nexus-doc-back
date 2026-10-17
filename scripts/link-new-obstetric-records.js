/**
 * Vincula consultas obstétricas sin pregnancy_id a una ficha de embarazo.
 *
 * Mismo criterio que la migración 20260810140000 (agrupar por paciente +
 * código EMBARAZOS del legado), pero incremental:
 *   1. Si la paciente ya tiene una ficha con consultas del MISMO código
 *      EMBARAZOS, la consulta se cuelga de esa ficha (caso normal: control
 *      prenatal nuevo de un embarazo ya en curso).
 *   2. Si no, se crea una ficha nueva con el mismo marcador de notas que usó
 *      la migración, para que siga siendo identificable y reversible.
 *
 * No modifica ninguna ficha existente salvo para vincularle consultas, y no
 * toca consultas que ya tienen pregnancy_id.
 *
 * Uso: DB_URL=... node scripts/link-new-obstetric-records.js [--apply]
 */
require('dotenv').config();
const crypto = require('crypto');
const { Sequelize } = require('sequelize');

const NOTES_MARKER =
  'Ficha creada automáticamente por migración de datos históricos (2026-08-10, corregida). ' +
  'Agrupada por código de embarazo legado. F.U.M. no disponible — verificar con la paciente y actualizar.';
const ACTIVE_WINDOW_DAYS = 180;

async function main() {
  const apply = process.argv.includes('--apply');
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });

  const [huerfanas] = await s.query(`
    SELECT id, patient_id, doctor_id, visit_date, ultrasound_findings->>'EMBARAZOS' AS code
    FROM clinical_records
    WHERE category = 'obstetrics' AND deleted_at IS NULL AND pregnancy_id IS NULL
    ORDER BY patient_id, visit_date`);
  // fichas existentes por (paciente, código) a partir de sus consultas
  const [existentes] = await s.query(`
    SELECT DISTINCT cr.patient_id, cr.ultrasound_findings->>'EMBARAZOS' AS code, cr.pregnancy_id
    FROM clinical_records cr
    WHERE cr.pregnancy_id IS NOT NULL AND cr.ultrasound_findings ? 'EMBARAZOS'`);
  const fichaPorClave = new Map(existentes.map((e) => [`${e.patient_id}|${e.code}`, e.pregnancy_id]));

  const vincular = []; // [recordId, pregnancyId]
  const nuevas = new Map(); // clave -> { id, patient_id, doctor_id, fechas[] }
  let sinCodigo = 0;
  for (const r of huerfanas) {
    if (!r.code) { sinCodigo++; continue; }
    const clave = `${r.patient_id}|${r.code}`;
    const existente = fichaPorClave.get(clave);
    if (existente) { vincular.push([r.id, existente]); continue; }
    if (!nuevas.has(clave)) nuevas.set(clave, { id: crypto.randomUUID(), patient_id: r.patient_id, doctor_id: r.doctor_id, fechas: [] });
    const n = nuevas.get(clave);
    n.fechas.push(new Date(r.visit_date));
    vincular.push([r.id, n.id]);
  }

  console.log(`Consultas obstétricas sin ficha: ${huerfanas.length}`);
  console.log(`  a fichas existentes (mismo código): ${vincular.length - [...nuevas.values()].reduce((a, n) => a + n.fechas.length, 0)}`);
  console.log(`  fichas nuevas a crear: ${nuevas.size} (${[...nuevas.values()].reduce((a, n) => a + n.fechas.length, 0)} consultas)`);
  console.log(`  sin código EMBARAZOS (no se tocan): ${sinCodigo}`);

  if (!apply) { console.log('Dry-run. Nada escrito.'); await s.close(); return; }

  await s.transaction(async (transaction) => {
    for (const n of nuevas.values()) {
      const [[{ max }]] = await s.query(
        'SELECT COALESCE(MAX(pregnancy_number), 0)::int AS max FROM pregnancies WHERE patient_id = $1',
        { bind: [n.patient_id], transaction });
      const [[{ activas }]] = await s.query(
        'SELECT COUNT(*)::int AS activas FROM pregnancies WHERE patient_id = $1 AND is_finalized = false AND deleted_at IS NULL',
        { bind: [n.patient_id], transaction });
      const ultima = new Date(Math.max(...n.fechas));
      const reciente = (Date.now() - ultima) / 86400000 <= ACTIVE_WINDOW_DAYS;
      // índice único parcial: una sola ficha activa por paciente
      const finalizada = !reciente || activas > 0;
      await s.query(
        `INSERT INTO pregnancies (id, patient_id, doctor_id, pregnancy_number, lmp_source, is_finalized,
           is_loss, is_ectopic, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'reported', $5, false, false, $6, now(), now())`,
        { bind: [n.id, n.patient_id, n.doctor_id, max + 1, finalizada, NOTES_MARKER], transaction });
    }
    await s.query(
      `UPDATE clinical_records cr SET pregnancy_id = v.pid
       FROM (SELECT unnest($1::uuid[]) AS rid, unnest($2::uuid[]) AS pid) v
       WHERE cr.id = v.rid AND cr.pregnancy_id IS NULL`,
      { bind: [vincular.map((v) => v[0]), vincular.map((v) => v[1])], transaction });
  });
  console.log(`Aplicado: ${vincular.length} consultas vinculadas, ${nuevas.size} fichas creadas.`);
  await s.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
