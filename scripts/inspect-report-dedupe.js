/**
 * Solo lectura. Explica por qué el import de informes propone insertar filas:
 * para cada informe candidato que no matchea exacto, mira si la consulta ya
 * tiene un informe con el mismo título (=> probable diferencia de texto, NO
 * un informe nuevo) o si la consulta no tiene ninguno (=> nuevo de verdad).
 *
 * Uso: DB_URL=... node scripts/inspect-report-dedupe.js <informes.json>
 */
require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');

const md5 = (s) => crypto.createHash('md5').update(s || '', 'utf8').digest('hex');
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function main() {
  const informes = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  const [patients] = await s.query('SELECT id, legacy_record_id FROM patients WHERE legacy_record_id IS NOT NULL');
  const [records] = await s.query('SELECT id, patient_id, visit_date, legacy_record_id FROM clinical_records WHERE deleted_at IS NULL AND visit_date IS NOT NULL');
  const [reports] = await s.query('SELECT clinical_record_id, COALESCE(title,\'\') AS title, content FROM medical_reports');

  const pid = new Map(patients.map((p) => [p.legacy_record_id, p.id]));
  const byDate = new Map();
  for (const r of records) {
    const k = `${r.patient_id}|${r.visit_date}`;
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k).push(r);
  }
  const exact = new Set(reports.map((r) => `${r.clinical_record_id}|${r.title}|${md5(r.content)}`));
  const normSet = new Set(reports.map((r) => `${r.clinical_record_id}|${r.title}|${md5(norm(r.content))}`));
  const byRecordTitle = new Set(reports.map((r) => `${r.clinical_record_id}|${r.title}`));
  const withAny = new Set(reports.map((r) => r.clinical_record_id));

  const st = { exacto: 0, igualNormalizado: 0, mismoTituloTextoDistinto: 0, consultaConOtroInforme: 0, consultaSinInformes: 0, deConsultaNueva: 0, otros: 0 };
  const ejemplos = [];
  for (const f of informes) {
    if (!f.contenido || !f.fecha) { st.otros++; continue; }
    const c = byDate.get(`${pid.get(f.pacienteLegacyCode)}|${f.fecha}`) || [];
    if (c.length !== 1) { st.otros++; continue; }
    const rec = c[0];
    const t = f.titulo || '';
    if (exact.has(`${rec.id}|${t}|${md5(f.contenido)}`)) { st.exacto++; continue; }
    if (normSet.has(`${rec.id}|${t}|${md5(norm(f.contenido))}`)) { st.igualNormalizado++; continue; }
    if (rec.legacy_record_id > 7372 && rec.legacy_record_id < 1000000) st.deConsultaNueva++;
    if (byRecordTitle.has(`${rec.id}|${t}`)) {
      st.mismoTituloTextoDistinto++;
      if (ejemplos.length < 2) ejemplos.push({ titulo: t, nuevo: f.contenido.slice(0, 80) });
    } else if (withAny.has(rec.id)) st.consultaConOtroInforme++;
    else st.consultaSinInformes++;
  }
  console.log(st);
  console.log(ejemplos);
  await s.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
