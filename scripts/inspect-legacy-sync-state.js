/**
 * Diagnóstico de solo lectura del estado de las tablas alimentadas desde
 * MedDig/VRunner. Sirve para decidir qué falta cargar de un backup nuevo.
 *
 * Uso: DB_URL=... node scripts/inspect-legacy-sync-state.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const CONSULTAS = [
  ['clinical_records (total)', 'SELECT COUNT(*)::int AS n FROM clinical_records WHERE deleted_at IS NULL'],
  ['  legacy 2021 (<1M)', 'SELECT COUNT(*)::int AS n, MAX(legacy_record_id) AS max_id, MAX(visit_date) AS max_fecha FROM clinical_records WHERE legacy_record_id < 1000000'],
  ['  legacy 2019 (>=1M)', 'SELECT COUNT(*)::int AS n, MAX(visit_date) AS max_fecha FROM clinical_records WHERE legacy_record_id >= 1000000'],
  ['  nativas (sin legacy)', 'SELECT COUNT(*)::int AS n FROM clinical_records WHERE legacy_record_id IS NULL'],
  ['  con recipe_items', 'SELECT COUNT(*)::int AS n FROM clinical_records WHERE recipe_items IS NOT NULL'],
  ['  con ultrasound_findings', 'SELECT COUNT(*)::int AS n FROM clinical_records WHERE ultrasound_findings IS NOT NULL'],
  ['  con next_appointment_date', 'SELECT COUNT(*)::int AS n FROM clinical_records WHERE next_appointment_date IS NOT NULL'],
  ['  con pregnancy_id', 'SELECT COUNT(*)::int AS n FROM clinical_records WHERE pregnancy_id IS NOT NULL'],
  ['  legacy 2021 posteriores a 2026-08-07', "SELECT COUNT(*)::int AS n FROM clinical_records WHERE legacy_record_id < 1000000 AND visit_date > '2026-08-07'"],
  ['patients', 'SELECT COUNT(*)::int AS n, MAX(legacy_record_id) FILTER (WHERE legacy_record_id < 100000) AS max_2021 FROM patients WHERE deleted_at IS NULL'],
  ['lab_exam_orders', 'SELECT COUNT(*)::int AS n, MAX(ordered_date) AS max_fecha FROM lab_exam_orders WHERE deleted_at IS NULL'],
  ['medical_reports', 'SELECT COUNT(*)::int AS n, MAX(created_at)::date AS max_creado FROM medical_reports'],
  ['pregnancies', 'SELECT COUNT(*)::int AS n, MAX(legacy_code) AS max_code FROM pregnancies WHERE deleted_at IS NULL'],
  ['general_ultrasounds', 'SELECT COUNT(*)::int AS n FROM general_ultrasounds'],
  ['medications', 'SELECT COUNT(*)::int AS n, MAX(legacy_code) AS max_code FROM medications'],
  ['lab_exams', 'SELECT COUNT(*)::int AS n, MAX(legacy_code) AS max_code FROM lab_exams'],
  ['diagnoses_catalog', 'SELECT COUNT(*)::int AS n, MAX(legacy_code) AS max_code FROM diagnoses_catalog'],
  ['medical_centers', 'SELECT COUNT(*)::int AS n FROM medical_centers'],
  ['referring_doctors', 'SELECT COUNT(*)::int AS n FROM referring_doctors'],
  ['icd10_codes', 'SELECT COUNT(*)::int AS n FROM icd10_codes'],
];

async function main() {
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  for (const [label, sql] of CONSULTAS) {
    try {
      const [row] = await s.query(sql, { type: Sequelize.QueryTypes.SELECT });
      console.log(label.padEnd(40), JSON.stringify(row));
    } catch (e) {
      console.log(label.padEnd(40), 'ERROR:', e.message);
    }
  }
  await s.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
