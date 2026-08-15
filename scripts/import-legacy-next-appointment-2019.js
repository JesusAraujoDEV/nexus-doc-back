/**
 * Backfill de clinical_records.next_appointment_date desde FCH-PROX-CITA
 * (data/scripts/analisis/30_extraer_proxima_cita.js), era CONSULTA_2019.
 * Mismo patrón de matching que los imports anteriores del mismo día: paciente
 * por cédula, consulta por fecha exacta. Solo actualiza filas que sigan en
 * null (no pisa nada que la doctora ya haya cargado a mano).
 *
 * Uso: DB_URL=... node scripts/import-legacy-next-appointment-2019.js <proxima_cita.json> <paciente_cedula.json>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

async function main() {
  const [, , citaPath, cedulaPath] = process.argv;
  if (!citaPath || !cedulaPath) {
    console.error('Uso: node scripts/import-legacy-next-appointment-2019.js <proxima_cita.json> <paciente_cedula.json>');
    process.exit(1);
  }

  const citas = JSON.parse(fs.readFileSync(citaPath, 'utf8'));
  const pacientes = JSON.parse(fs.readFileSync(cedulaPath, 'utf8'));
  const cedulaCounts = new Map();
  for (const p of pacientes) cedulaCounts.set(p.cedula, (cedulaCounts.get(p.cedula) || 0) + 1);
  const cedulaByCodigo = new Map(pacientes.map((p) => [p.codigo, p.cedula]));

  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  console.log('Cargando patients/clinical_records...');
  const [patientRows] = await sequelize.query(`SELECT id, cedula FROM patients WHERE cedula IS NOT NULL`);
  const [recordRows] = await sequelize.query(
    `SELECT id, patient_id, visit_date FROM clinical_records
     WHERE deleted_at IS NULL AND visit_date IS NOT NULL AND next_appointment_date IS NULL`,
  );
  console.log(`patients=${patientRows.length} clinical_records sin next_appointment_date=${recordRows.length}`);

  const patientIdByCedula = new Map(patientRows.map((p) => [p.cedula, p.id]));
  const recordsByPatientAndDate = new Map();
  for (const r of recordRows) {
    const key = `${r.patient_id}|${r.visit_date}`;
    if (!recordsByPatientAndDate.has(key)) recordsByPatientAndDate.set(key, []);
    recordsByPatientAndDate.get(key).push(r.id);
  }

  const stats = {
    actualizadas: 0, sinCedula: 0, cedulaDuplicada: 0, pacienteNoEncontrado: 0,
    sinConsultaEnFecha: 0, variasConsultasEnFecha: 0,
  };
  const ids = [];
  const fechas = [];

  for (const fila of citas) {
    const cedula = cedulaByCodigo.get(fila.pacienteLegacyCode);
    if (!cedula) { stats.sinCedula++; continue; }
    if (cedulaCounts.get(cedula) > 1) { stats.cedulaDuplicada++; continue; }

    const patientId = patientIdByCedula.get(cedula);
    if (!patientId) { stats.pacienteNoEncontrado++; continue; }

    const candidates = recordsByPatientAndDate.get(`${patientId}|${fila.fecha}`) || [];
    if (candidates.length === 0) { stats.sinConsultaEnFecha++; continue; }
    if (candidates.length > 1) { stats.variasConsultasEnFecha++; continue; }

    ids.push(candidates[0]);
    fechas.push(fila.proximaCita);
  }

  console.log(`Preparadas ${ids.length} actualizaciones (de ${citas.length} candidatas).`);

  if (ids.length) {
    await sequelize.query(
      `
      UPDATE clinical_records cr SET next_appointment_date = v.fecha
      FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::date[]) AS fecha) v
      WHERE cr.id = v.id
      `,
      { bind: [ids, fechas] },
    );
    stats.actualizadas = ids.length;
  }

  console.log('Resultado:', stats);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
