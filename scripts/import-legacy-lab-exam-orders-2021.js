/**
 * Igual que import-legacy-lab-exam-orders-2019.js, pero para la era
 * CONSULTA_2021_v2 (ahora desbloqueada). Esta era SÍ comparte numeración con
 * patients.legacy_record_id (confirmado: PACIENTES=2728 en ORDEN-EX.DAT cae
 * en la misma fecha que la primera consulta prenatal real de esa paciente),
 * así que el paciente se matchea directo por legacy_record_id, sin necesitar
 * el cruce por cédula que requería la era 2019.
 *
 * Uso: DB_URL=... node scripts/import-legacy-lab-exam-orders-2021.js <ordenes.json>
 */
const fs = require('fs');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

async function main() {
  const [, , ordenesPath] = process.argv;
  if (!ordenesPath) {
    console.error('Uso: node scripts/import-legacy-lab-exam-orders-2021.js <ordenes.json>');
    process.exit(1);
  }

  const ordenes = JSON.parse(fs.readFileSync(ordenesPath, 'utf8'));
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  console.log('Cargando patients/lab_exams/clinical_records/doctor...');
  const [[doctor]] = await sequelize.query(`SELECT id FROM doctors LIMIT 1`);
  const [patientRows] = await sequelize.query(`SELECT id, legacy_record_id FROM patients WHERE legacy_record_id IS NOT NULL`);
  const [examRows] = await sequelize.query(`SELECT id, legacy_code FROM lab_exams WHERE legacy_code IS NOT NULL`);
  const [recordRows] = await sequelize.query(
    `SELECT id, patient_id, visit_date FROM clinical_records WHERE deleted_at IS NULL AND visit_date IS NOT NULL`,
  );
  console.log(`patients=${patientRows.length} lab_exams=${examRows.length} clinical_records=${recordRows.length}`);

  const patientIdByLegacyCode = new Map(patientRows.map((p) => [p.legacy_record_id, p.id]));
  const examIdByLegacyCode = new Map(examRows.map((e) => [e.legacy_code, e.id]));
  const recordsByPatientAndDate = new Map();
  for (const r of recordRows) {
    const key = `${r.patient_id}|${r.visit_date}`;
    if (!recordsByPatientAndDate.has(key)) recordsByPatientAndDate.set(key, []);
    recordsByPatientAndDate.get(key).push(r.id);
  }

  const stats = {
    creadas: 0, pacienteNoEncontrado: 0, examenNoEncontrado: 0, sinConsultaEnFecha: 0, variasConsultasEnFecha: 0,
  };
  const rowsToInsert = [];
  const dedupe = new Set();

  for (const fila of ordenes) {
    const patientId = patientIdByLegacyCode.get(fila.pacienteLegacyCode);
    if (!patientId) { stats.pacienteNoEncontrado++; continue; }

    const examId = examIdByLegacyCode.get(fila.examLegacyCode);
    if (!examId) { stats.examenNoEncontrado++; continue; }

    const candidates = recordsByPatientAndDate.get(`${patientId}|${fila.fecha}`) || [];
    if (candidates.length === 0) { stats.sinConsultaEnFecha++; continue; }
    if (candidates.length > 1) { stats.variasConsultasEnFecha++; continue; }
    const recordId = candidates[0];

    const dedupeKey = `${examId}|${recordId}`;
    if (dedupe.has(dedupeKey)) continue;
    dedupe.add(dedupeKey);

    rowsToInsert.push({ id: crypto.randomUUID(), examId, patientId, doctorId: doctor.id, recordId, fecha: fila.fecha });
  }

  console.log(`Preparadas ${rowsToInsert.length} filas para insertar (de ${ordenes.length} candidatas).`);

  const LOTE = 2000;
  await sequelize.transaction(async (transaction) => {
    for (let i = 0; i < rowsToInsert.length; i += LOTE) {
      const lote = rowsToInsert.slice(i, i + LOTE);
      const ahora = new Date().toISOString();
      await sequelize.query(
        `
        INSERT INTO lab_exam_orders (id, exam_id, patient_id, doctor_id, ordered_record_id, ordered_date, created_at, updated_at)
        SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[], $5::uuid[], $6::date[], $7::timestamptz[], $7::timestamptz[])
        `,
        {
          bind: [
            lote.map((r) => r.id),
            lote.map((r) => r.examId),
            lote.map((r) => r.patientId),
            lote.map((r) => r.doctorId),
            lote.map((r) => r.recordId),
            lote.map((r) => r.fecha),
            lote.map(() => ahora),
          ],
          transaction,
        },
      );
      stats.creadas += lote.length;
      console.log(`  insertadas ${stats.creadas}/${rowsToInsert.length}`);
    }
  });

  console.log('Resultado:', stats);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
