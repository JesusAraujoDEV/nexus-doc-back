const sequelize = require('../../libs/sequelize');

/** Fidelización: mismo fenómeno (¿vuelven las pacientes?) visto desde tres ángulos. */
async function inactivePatients(doctorId) {
  const [row] = await sequelize.query(
    `SELECT COUNT(*)::int AS count FROM patients p
     WHERE p.doctor_id = :doctorId AND p.deleted_at IS NULL
       AND (SELECT MAX(COALESCE(cr.visit_date, cr.created_at::date))
            FROM clinical_records cr WHERE cr.patient_id = p.id AND cr.deleted_at IS NULL)
           < (CURRENT_DATE - INTERVAL '12 months')`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return { months: 12, count: row.count };
}

async function avgConsultationsPerPatient(doctorId) {
  const [row] = await sequelize.query(
    `SELECT ROUND(AVG(cnt), 1) AS avg, MAX(cnt)::int AS max FROM (
       SELECT COUNT(*)::int AS cnt FROM clinical_records
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
       GROUP BY patient_id
     ) sub`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return { avg: Number(row.avg) || 0, max: Number(row.max) || 0 };
}

async function avgDaysBetweenVisits(doctorId) {
  const [row] = await sequelize.query(
    `WITH ordered AS (
       SELECT patient_id,
              COALESCE(visit_date, created_at::date) AS vd,
              LAG(COALESCE(visit_date, created_at::date))
                OVER (PARTITION BY patient_id ORDER BY COALESCE(visit_date, created_at::date)) AS prev
       FROM clinical_records
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
     )
     SELECT ROUND(AVG(vd - prev))::int AS avg_days FROM ordered WHERE prev IS NOT NULL`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return { avgDays: Number(row.avg_days) || 0 };
}

async function retentionRate(doctorId) {
  const [row] = await sequelize.query(
    `WITH recent AS (
       SELECT patient_id, COUNT(*)::int AS visits
       FROM clinical_records
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
         AND COALESCE(visit_date, created_at::date) >= (CURRENT_DATE - INTERVAL '12 months')
       GROUP BY patient_id
     )
     SELECT COUNT(*) FILTER (WHERE visits >= 2)::int AS returning, COUNT(*)::int AS total FROM recent`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  const pct = row.total > 0 ? Math.round((row.returning / row.total) * 100) : 0;
  return { returning: Number(row.returning), total: Number(row.total), pct };
}

module.exports = { inactivePatients, avgConsultationsPerPatient, avgDaysBetweenVisits, retentionRate };
