/**
 * Igual que import-legacy-next-appointment-2019.js, para la era
 * CONSULTA_2021_v2 - paciente matcheado directo por legacy_record_id.
 *
 * Uso: DB_URL=... node scripts/import-legacy-next-appointment-2021.js <proxima_cita.json>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

async function main() {
  const [, , citaPath] = process.argv;
  if (!citaPath) {
    console.error('Uso: node scripts/import-legacy-next-appointment-2021.js <proxima_cita.json>');
    process.exit(1);
  }

  const citas = JSON.parse(fs.readFileSync(citaPath, 'utf8'));
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  console.log('Cargando patients/clinical_records...');
  const [patientRows] = await sequelize.query(`SELECT id, legacy_record_id FROM patients WHERE legacy_record_id IS NOT NULL`);
  const [recordRows] = await sequelize.query(
    `SELECT id, patient_id, visit_date FROM clinical_records
     WHERE deleted_at IS NULL AND visit_date IS NOT NULL AND next_appointment_date IS NULL`,
  );
  console.log(`patients=${patientRows.length} clinical_records sin next_appointment_date=${recordRows.length}`);

  const patientIdByLegacyCode = new Map(patientRows.map((p) => [p.legacy_record_id, p.id]));
  const recordsByPatientAndDate = new Map();
  for (const r of recordRows) {
    const key = `${r.patient_id}|${r.visit_date}`;
    if (!recordsByPatientAndDate.has(key)) recordsByPatientAndDate.set(key, []);
    recordsByPatientAndDate.get(key).push(r.id);
  }

  const stats = { actualizadas: 0, pacienteNoEncontrado: 0, sinConsultaEnFecha: 0, variasConsultasEnFecha: 0 };
  const ids = [];
  const fechas = [];

  for (const fila of citas) {
    const patientId = patientIdByLegacyCode.get(fila.pacienteLegacyCode);
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
