/**
 * Importa órdenes de examen reales (SELECTED=true en ORDEN-EX.DAT, era
 * CONSULTA_2019) a lab_exam_orders. 26,654 filas extraídas por
 * data/scripts/analisis/26_extraer_orden_ex.js - la tabla completa (3.68M
 * filas) es un producto cruzado catálogo x consulta; solo estas se marcaron
 * de verdad.
 *
 * Igual que el import de embarazos 2019: el paciente se cruza por CEDULA
 * (esa era usa su propia numeración de PACIENTE.DAT, distinta de
 * patients.legacy_record_id), y la consulta por fecha exacta (CONSULTAS en
 * ORDEN-EX.DAT es el consecutivo DENTRO del paciente en el legado, no un id
 * que sirva para cruzar contra clinical_records ya consolidado).
 *
 * Reescrito para hacer TODO el matching en memoria (carga patients/lab_exams/
 * clinical_records una sola vez cada uno) e insertar en un solo lote: la
 * primera versión hacía ~5 consultas por fila (una por una, ~130,000 idas y
 * vueltas a una base remota) y con la conexión lenta del usuario no
 * terminaba nunca. Esta versión hace un puñado de consultas en total.
 *
 * Uso: DB_URL=... node scripts/import-legacy-lab-exam-orders-2019.js <ordenes.json> <paciente_cedula.json>
 */
const fs = require('fs');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

async function main() {
  const [, , ordenesPath, cedulaPath] = process.argv;
  if (!ordenesPath || !cedulaPath) {
    console.error('Uso: node scripts/import-legacy-lab-exam-orders-2019.js <ordenes.json> <paciente_cedula.json>');
    process.exit(1);
  }

  const ordenes = JSON.parse(fs.readFileSync(ordenesPath, 'utf8'));
  const pacientes = JSON.parse(fs.readFileSync(cedulaPath, 'utf8'));
  const cedulaCounts = new Map();
  for (const p of pacientes) cedulaCounts.set(p.cedula, (cedulaCounts.get(p.cedula) || 0) + 1);
  const cedulaByCodigo = new Map(pacientes.map((p) => [p.codigo, p.cedula]));

  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  console.log('Cargando patients/lab_exams/clinical_records/doctor...');
  const [[doctor]] = await sequelize.query(`SELECT id FROM doctors LIMIT 1`);
  const [patientRows] = await sequelize.query(`SELECT id, cedula FROM patients WHERE cedula IS NOT NULL`);
  const [examRows] = await sequelize.query(`SELECT id, legacy_code FROM lab_exams WHERE legacy_code IS NOT NULL`);
  const [recordRows] = await sequelize.query(
    `SELECT id, patient_id, visit_date FROM clinical_records WHERE deleted_at IS NULL AND visit_date IS NOT NULL`,
  );
  console.log(`patients=${patientRows.length} lab_exams=${examRows.length} clinical_records=${recordRows.length}`);

  const patientIdByCedula = new Map(patientRows.map((p) => [p.cedula, p.id]));
  const examIdByLegacyCode = new Map(examRows.map((e) => [e.legacy_code, e.id]));
  const recordsByPatientAndDate = new Map(); // patientId|visitDate -> record.id[]
  for (const r of recordRows) {
    const key = `${r.patient_id}|${r.visit_date}`;
    if (!recordsByPatientAndDate.has(key)) recordsByPatientAndDate.set(key, []);
    recordsByPatientAndDate.get(key).push(r.id);
  }

  const stats = {
    creadas: 0, sinCedula: 0, cedulaDuplicada: 0, pacienteNoEncontrado: 0,
    examenNoEncontrado: 0, sinConsultaEnFecha: 0, variasConsultasEnFecha: 0,
  };
  const rowsToInsert = [];
  const dedupe = new Set();

  for (const fila of ordenes) {
    const cedula = cedulaByCodigo.get(fila.pacienteLegacyCode);
    if (!cedula) { stats.sinCedula++; continue; }
    if (cedulaCounts.get(cedula) > 1) { stats.cedulaDuplicada++; continue; }

    const patientId = patientIdByCedula.get(cedula);
    if (!patientId) { stats.pacienteNoEncontrado++; continue; }

    const examId = examIdByLegacyCode.get(fila.examLegacyCode);
    if (!examId) { stats.examenNoEncontrado++; continue; }

    const candidates = recordsByPatientAndDate.get(`${patientId}|${fila.fecha}`) || [];
    if (candidates.length === 0) { stats.sinConsultaEnFecha++; continue; }
    if (candidates.length > 1) { stats.variasConsultasEnFecha++; continue; }
    const recordId = candidates[0];

    const dedupeKey = `${examId}|${recordId}`;
    if (dedupe.has(dedupeKey)) continue; // el JSON puede repetir la misma orden en filas distintas
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
