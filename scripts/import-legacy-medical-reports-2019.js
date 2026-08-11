/**
 * Importa los informes médicos reales (contenido + fecha ya resueltos por
 * data/scripts/analisis/28_extraer_informes.js) de la era CONSULTA_2019.
 * Mismo patrón que import-legacy-lab-exam-orders-2019.js: paciente por
 * cédula (numeración de esta era no coincide con legacy_record_id), consulta
 * por fecha exacta, todo cargado en memoria y en un solo insert por lotes.
 *
 * Uso: DB_URL=... node scripts/import-legacy-medical-reports-2019.js <informes.json> <paciente_cedula.json> <med_esp.json> <cent_med.json>
 */
const fs = require('fs');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');
const { buildLookup } = require('./legacy-report-catalog-lookup');

async function main() {
  const [, , informesPath, cedulaPath, medEspPath, centMedPath] = process.argv;
  if (!informesPath || !cedulaPath || !medEspPath || !centMedPath) {
    console.error('Uso: node scripts/import-legacy-medical-reports-2019.js <informes.json> <paciente_cedula.json> <med_esp.json> <cent_med.json>');
    process.exit(1);
  }

  const informes = JSON.parse(fs.readFileSync(informesPath, 'utf8'));
  const pacientes = JSON.parse(fs.readFileSync(cedulaPath, 'utf8'));
  const cedulaCounts = new Map();
  for (const p of pacientes) cedulaCounts.set(p.cedula, (cedulaCounts.get(p.cedula) || 0) + 1);
  const cedulaByCodigo = new Map(pacientes.map((p) => [p.codigo, p.cedula]));

  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  console.log('Cargando patients/clinical_records/doctor/catalogos...');
  const [[doctor]] = await sequelize.query(`SELECT id FROM doctors LIMIT 1`);
  const [patientRows] = await sequelize.query(`SELECT id, cedula FROM patients WHERE cedula IS NOT NULL`);
  const [recordRows] = await sequelize.query(
    `SELECT id, patient_id, visit_date FROM clinical_records WHERE deleted_at IS NULL AND visit_date IS NOT NULL`,
  );
  const [doctorRows] = await sequelize.query(`SELECT id, name FROM referring_doctors`);
  const [centerRows] = await sequelize.query(`SELECT id, name FROM medical_centers`);
  const doctorLookup = buildLookup(medEspPath, doctorRows);
  const centerLookup = buildLookup(centMedPath, centerRows);
  console.log(`patients=${patientRows.length} clinical_records=${recordRows.length} doctorLookup=${doctorLookup.size} centerLookup=${centerLookup.size}`);

  const patientIdByCedula = new Map(patientRows.map((p) => [p.cedula, p.id]));
  const recordsByPatientAndDate = new Map();
  for (const r of recordRows) {
    const key = `${r.patient_id}|${r.visit_date}`;
    if (!recordsByPatientAndDate.has(key)) recordsByPatientAndDate.set(key, []);
    recordsByPatientAndDate.get(key).push(r.id);
  }

  const stats = {
    creadas: 0, sinContenidoOFecha: 0, sinCedula: 0, cedulaDuplicada: 0,
    pacienteNoEncontrado: 0, sinConsultaEnFecha: 0, variasConsultasEnFecha: 0,
  };
  const rowsToInsert = [];

  for (const fila of informes) {
    if (!fila.contenido || !fila.fecha) { stats.sinContenidoOFecha++; continue; }
    const cedula = cedulaByCodigo.get(fila.pacienteLegacyCode);
    if (!cedula) { stats.sinCedula++; continue; }
    if (cedulaCounts.get(cedula) > 1) { stats.cedulaDuplicada++; continue; }

    const patientId = patientIdByCedula.get(cedula);
    if (!patientId) { stats.pacienteNoEncontrado++; continue; }

    const candidates = recordsByPatientAndDate.get(`${patientId}|${fila.fecha}`) || [];
    if (candidates.length === 0) { stats.sinConsultaEnFecha++; continue; }
    if (candidates.length > 1) { stats.variasConsultasEnFecha++; continue; }
    const recordId = candidates[0];

    rowsToInsert.push({
      id: crypto.randomUUID(),
      clinicalRecordId: recordId,
      patientId,
      doctorId: doctor.id,
      title: fila.titulo,
      referringDoctorId: doctorLookup.get(fila.medEspLegacyCode) || null,
      medicalCenterId: centerLookup.get(fila.centMedLegacyCode) || null,
      content: fila.contenido,
    });
  }

  console.log(`Preparados ${rowsToInsert.length} informes para insertar (de ${informes.length} candidatos).`);

  const LOTE = 2000;
  await sequelize.transaction(async (transaction) => {
    for (let i = 0; i < rowsToInsert.length; i += LOTE) {
      const lote = rowsToInsert.slice(i, i + LOTE);
      const ahora = new Date().toISOString();
      await sequelize.query(
        `
        INSERT INTO medical_reports
          (id, clinical_record_id, patient_id, doctor_id, type, title, referring_doctor_id, medical_center_id, content, created_at, updated_at)
        SELECT * FROM unnest(
          $1::uuid[], $2::uuid[], $3::uuid[], $4::uuid[], $5::text[], $6::text[], $7::uuid[], $8::uuid[], $9::text[], $10::timestamptz[], $10::timestamptz[]
        )
        `,
        {
          bind: [
            lote.map((r) => r.id),
            lote.map((r) => r.clinicalRecordId),
            lote.map((r) => r.patientId),
            lote.map((r) => r.doctorId),
            lote.map(() => 'informe'),
            lote.map((r) => r.title),
            lote.map((r) => r.referringDoctorId),
            lote.map((r) => r.medicalCenterId),
            lote.map((r) => r.content),
            lote.map(() => ahora),
          ],
          transaction,
        },
      );
      stats.creadas += lote.length;
      console.log(`  insertados ${stats.creadas}/${rowsToInsert.length}`);
    }
  });

  console.log('Resultado:', stats);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
