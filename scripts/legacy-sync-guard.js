/**
 * Frenos antes de que una sincronización automática escriba en producción.
 * Solo lectura. Imprime una línea `GUARD {json}` y sale con:
 *   0 = se puede cargar
 *   3 = requiere revisión humana (no se carga nada)
 *
 * Frenos:
 *   - identidad: las pacientes que ya existen deben tener el mismo nombre en
 *     el paquete. Si no, es otra carpeta (p. ej. la era 2019, que reusa la
 *     numeración) y cargarla mezclaría historias.
 *   - volumen: demasiadas pacientes o consultas nuevas de una vez.
 *
 * Uso: node -r dotenv/config scripts/legacy-sync-guard.js <carpeta-paquete>
 */
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const MAX_NEW_PATIENTS = Number(process.env.LEGACY_SYNC_MAX_NEW_PATIENTS || 300);
const MAX_NEW_RECORDS = Number(process.env.LEGACY_SYNC_MAX_NEW_RECORDS || 2000);
const MIN_NAME_MATCH = 0.9;

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();

function nameMatchRatio(incoming, dbById) {
  let both = 0;
  let same = 0;
  for (const p of incoming) {
    const db = dbById.get(p.id);
    if (!db || !p.NOMBRE) continue;
    both += 1;
    if (norm(p.NOMBRE) === norm(db)) same += 1;
  }
  return { both, ratio: both ? same / both : 1 };
}

function verdict(stats) {
  if (stats.overlap >= 50 && stats.nameMatch < MIN_NAME_MATCH) {
    return `Los nombres no coinciden con los de la base (${Math.round(stats.nameMatch * 100)}%): puede ser otra carpeta de VRunner.`;
  }
  if (stats.newPatients > MAX_NEW_PATIENTS) return `Hay ${stats.newPatients} pacientes nuevas (máximo automático ${MAX_NEW_PATIENTS}).`;
  if (stats.newRecords > MAX_NEW_RECORDS) return `Hay ${stats.newRecords} consultas nuevas (máximo automático ${MAX_NEW_RECORDS}).`;
  return null;
}

async function main() {
  const dir = process.argv[2];
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const pacientes = read('pacientes_decodificados.json');
  const consultas = read('consultas_corregidas.json');

  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  const pats = await s.query(
    "SELECT legacy_record_id AS lid, first_name || ' ' || last_name AS name FROM patients WHERE legacy_record_id < 100000",
    { type: Sequelize.QueryTypes.SELECT },
  );
  const recs = await s.query('SELECT legacy_record_id AS lid FROM clinical_records WHERE legacy_record_id < 1000000', { type: Sequelize.QueryTypes.SELECT });
  await s.close();

  const dbById = new Map(pats.map((p) => [p.lid, p.name]));
  const recIds = new Set(recs.map((r) => r.lid));
  const { both, ratio } = nameMatchRatio(pacientes, dbById);
  const stats = {
    incomingPatients: pacientes.length,
    incomingRecords: consultas.length,
    newPatients: pacientes.filter((p) => !dbById.has(p.id)).length,
    newRecords: consultas.filter((c) => !recIds.has(c.legacyRecordId)).length,
    overlap: both,
    nameMatch: Number(ratio.toFixed(3)),
  };
  const reason = verdict(stats);
  console.log(`GUARD ${JSON.stringify({ ...stats, reason })}`);
  process.exit(reason ? 3 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
