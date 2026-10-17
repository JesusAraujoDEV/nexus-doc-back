/**
 * Solo lectura. Comprobaciones de integridad que deben dar 0 después de
 * cualquier carga legacy. Sale con código 1 si alguna falla.
 *
 * Uso: DB_URL=... node scripts/check-legacy-integrity.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const CHECKS = [
  ['órdenes de examen sin consulta (CHECK)', 'SELECT COUNT(*)::int AS n FROM lab_exam_orders WHERE ordered_record_id IS NULL AND result_record_id IS NULL'],
  ['órdenes duplicadas (examen + consulta)', 'SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM lab_exam_orders WHERE ordered_record_id IS NOT NULL AND deleted_at IS NULL GROUP BY exam_id, ordered_record_id HAVING COUNT(*) > 1) x'],
  // Mismo título y mismo contenido normalizado = duplicado real. Mismo título con
  // contenido distinto es legítimo (dos "INFORME MEDICO" en la misma consulta):
  // hay 52 de esos de la carga de agosto 2026.
  ['informes duplicados (consulta + título + texto)', "SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM medical_reports GROUP BY clinical_record_id, title, md5(regexp_replace(regexp_replace(COALESCE(content, ''), '^[^A-Za-z0-9]{1,2}', ''), '\\s+', ' ', 'g')) HAVING COUNT(*) > 1) x"],
  ['pacientes con más de un embarazo activo', 'SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM pregnancies WHERE is_finalized = false AND deleted_at IS NULL GROUP BY patient_id HAVING COUNT(*) > 1) x'],
  ['consultas obstétricas sin ficha de embarazo', "SELECT COUNT(*)::int AS n FROM clinical_records WHERE category = 'obstetrics' AND pregnancy_id IS NULL AND deleted_at IS NULL"],
  ['consultas legacy duplicadas', 'SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM clinical_records WHERE legacy_record_id IS NOT NULL GROUP BY legacy_record_id HAVING COUNT(*) > 1) x'],
  ['pacientes "Sin nombre"', "SELECT COUNT(*)::int AS n FROM patients WHERE first_name = 'Sin nombre' AND deleted_at IS NULL"],
];

async function main() {
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  let fallos = 0;
  for (const [label, sql] of CHECKS) {
    const [{ n }] = await s.query(sql, { type: Sequelize.QueryTypes.SELECT });
    if (n > 0) fallos++;
    console.log(`${n === 0 ? '✓' : '✗'} ${label.padEnd(45)} ${n}`);
  }
  await s.close();
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
