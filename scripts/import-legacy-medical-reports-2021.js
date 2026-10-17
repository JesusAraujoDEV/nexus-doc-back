/**
 * Igual que import-legacy-medical-reports-2019.js, para la era
 * CONSULTA_2021_v2 - esta sí comparte numeración con patients.legacy_record_id,
 * así que el paciente se matchea directo (sin cédula).
 *
 * Uso: DB_URL=... node scripts/import-legacy-medical-reports-2021.js <informes.json> <med_esp.json> <cent_med.json> [--apply]
 *
 * Idempotente: omite informes que ya existen (misma consulta + título +
 * contenido), así que se puede re-correr sobre un backup nuevo. Sin --apply
 * es dry-run.
 */
const fs = require('fs');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');
const { buildLookup } = require('./legacy-report-catalog-lookup');

async function main() {
  const [, , informesPath, medEspPath, centMedPath] = process.argv;
  if (!informesPath || !medEspPath || !centMedPath) {
    console.error('Uso: node scripts/import-legacy-medical-reports-2021.js <informes.json> <med_esp.json> <cent_med.json>');
    process.exit(1);
  }

  const informes = JSON.parse(fs.readFileSync(informesPath, 'utf8'));
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  console.log('Cargando patients/clinical_records/doctor/catalogos...');
  const [[doctor]] = await sequelize.query(`SELECT id FROM doctors LIMIT 1`);
  const [patientRows] = await sequelize.query(`SELECT id, legacy_record_id FROM patients WHERE legacy_record_id IS NOT NULL`);
  const [recordRows] = await sequelize.query(
    `SELECT id, patient_id, visit_date FROM clinical_records WHERE deleted_at IS NULL AND visit_date IS NOT NULL`,
  );
  const [doctorRows] = await sequelize.query(`SELECT id, name FROM referring_doctors`);
  const [centerRows] = await sequelize.query(`SELECT id, name FROM medical_centers`);
  const doctorLookup = buildLookup(medEspPath, doctorRows);
  const centerLookup = buildLookup(centMedPath, centerRows);
  console.log(`patients=${patientRows.length} clinical_records=${recordRows.length} doctorLookup=${doctorLookup.size} centerLookup=${centerLookup.size}`);

  // Idempotencia: medical_reports no tiene clave legacy. Se considera ya cargado
  // un informe con la misma consulta + título + contenido. Sin esto, re-correr
  // sobre un backup nuevo duplica todos los informes existentes.
  const [existingRows] = await sequelize.query(
    `SELECT clinical_record_id, COALESCE(title, '') AS title, md5(COALESCE(content, '')) AS h FROM medical_reports`,
  );
  // Clave = (consulta, título). El contenido NO sirve como clave: entre backups
  // el extractor deja 1-2 bytes de prefijo de bloque distintos al inicio del
  // texto, así que el mismo informe aparece con hash distinto (verificado:
  // 260 de 295 "nuevos" eran informes ya cargados). Una misma consulta no
  // repite título de informe en el legado.
  const existentes = new Set(existingRows.map((r) => `${r.clinical_record_id}|${r.title}`));
  console.log(`medical_reports ya en BD=${existingRows.length}`);
  // Quita el prefijo de longitud del bloque CND que el extractor arrastra:
  // 1-2 caracteres no imprimibles o latin1 sueltos antes del texto real.
  const limpiarPrefijo = (s) => (s || '').replace(/^[^A-Za-z0-9\s(¿¡"]{1,2}(?=[A-Za-z0-9\s(¿¡"])/, '').replace(/^[\x00-\x1f]+/, '').trim();

  const patientIdByLegacyCode = new Map(patientRows.map((p) => [p.legacy_record_id, p.id]));
  const recordsByPatientAndDate = new Map();
  for (const r of recordRows) {
    const key = `${r.patient_id}|${r.visit_date}`;
    if (!recordsByPatientAndDate.has(key)) recordsByPatientAndDate.set(key, []);
    recordsByPatientAndDate.get(key).push(r.id);
  }

  const stats = {
    creadas: 0, yaExistentes: 0, sinContenidoOFecha: 0, pacienteNoEncontrado: 0, sinConsultaEnFecha: 0, variasConsultasEnFecha: 0,
  };
  const rowsToInsert = [];

  for (const fila of informes) {
    if (!fila.contenido || !fila.fecha) { stats.sinContenidoOFecha++; continue; }
    const patientId = patientIdByLegacyCode.get(fila.pacienteLegacyCode);
    if (!patientId) { stats.pacienteNoEncontrado++; continue; }

    const candidates = recordsByPatientAndDate.get(`${patientId}|${fila.fecha}`) || [];
    if (candidates.length === 0) { stats.sinConsultaEnFecha++; continue; }
    if (candidates.length > 1) { stats.variasConsultasEnFecha++; continue; }
    const recordId = candidates[0];

    const clave = `${recordId}|${fila.titulo || ''}`;
    if (existentes.has(clave)) { stats.yaExistentes++; continue; }
    existentes.add(clave);

    rowsToInsert.push({
      id: crypto.randomUUID(),
      clinicalRecordId: recordId,
      patientId,
      doctorId: doctor.id,
      title: fila.titulo,
      referringDoctorId: doctorLookup.get(fila.medEspLegacyCode) || null,
      medicalCenterId: centerLookup.get(fila.centMedLegacyCode) || null,
      content: limpiarPrefijo(fila.contenido),
    });
  }

  console.log(`Preparados ${rowsToInsert.length} informes para insertar (de ${informes.length} candidatos).`);
  if (!process.argv.includes('--apply')) {
    console.log('Dry-run. Nada escrito. Volver a correr con --apply.', stats);
    await sequelize.close();
    return;
  }

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
