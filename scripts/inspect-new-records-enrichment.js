/**
 * Solo lectura. Para las consultas legacy 2021 posteriores a una fecha de
 * corte, cuenta cuántas tienen cada dato derivado (récipe, eco, próxima cita,
 * embarazo, órdenes de examen, informes). Sirve para ver qué enriquecimiento
 * le falta a una carga diferencial.
 *
 * Uso: DB_URL=... node scripts/inspect-new-records-enrichment.js [YYYY-MM-DD]
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

async function main() {
  const corte = process.argv[2] || '2026-08-07';
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  const [row] = await s.query(
    `SELECT
       COUNT(*)::int AS consultas,
       COUNT(*) FILTER (WHERE treatment IS NOT NULL)::int AS con_tratamiento,
       COUNT(*) FILTER (WHERE lab_orders IS NOT NULL)::int AS con_lab_orders_texto,
       COUNT(*) FILTER (WHERE recipe_items IS NOT NULL)::int AS con_recipe_items,
       COUNT(*) FILTER (WHERE ultrasound_findings IS NOT NULL)::int AS con_eco,
       COUNT(*) FILTER (WHERE next_appointment_date IS NOT NULL)::int AS con_proxima_cita,
       COUNT(*) FILTER (WHERE pregnancy_id IS NOT NULL)::int AS con_embarazo,
       COUNT(*) FILTER (WHERE UPPER(visit_type) LIKE '%PRENATAL%')::int AS prenatales,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM lab_exam_orders o WHERE o.ordered_record_id = cr.id))::int AS con_ordenes_examen,
       COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM medical_reports m WHERE m.clinical_record_id = cr.id))::int AS con_informes
     FROM clinical_records cr
     WHERE legacy_record_id < 1000000 AND visit_date > :corte AND deleted_at IS NULL`,
    { replacements: { corte }, type: Sequelize.QueryTypes.SELECT },
  );
  console.log(`Consultas legacy 2021 posteriores a ${corte}:`);
  for (const [k, v] of Object.entries(row)) console.log(`  ${k.padEnd(22)} ${v}`);
  await s.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
