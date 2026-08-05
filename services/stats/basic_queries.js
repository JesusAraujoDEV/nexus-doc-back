const sequelize = require('../../libs/sequelize');

async function totals(doctorId) {
  const [row] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*) FROM patients WHERE doctor_id = :doctorId AND deleted_at IS NULL) AS patients,
       (SELECT COUNT(*) FROM clinical_records WHERE doctor_id = :doctorId AND deleted_at IS NULL) AS consultations,
       (SELECT COUNT(*) FROM patients WHERE doctor_id = :doctorId AND birth_date IS NOT NULL AND deleted_at IS NULL) AS "withBirthDate",
       (SELECT COUNT(*) FROM clinical_records WHERE doctor_id = :doctorId AND deleted_at IS NULL
          AND COALESCE(visit_date, created_at::date) >= date_trunc('month', CURRENT_DATE)) AS "consultationsThisMonth"`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return {
    patients: Number(row.patients),
    consultations: Number(row.consultations),
    withBirthDate: Number(row.withBirthDate),
    consultationsThisMonth: Number(row.consultationsThisMonth),
  };
}

function consultationsByMonth(doctorId) {
  return sequelize.query(
    `SELECT to_char(date_trunc('month', COALESCE(visit_date, created_at::date)), 'YYYY-MM') AS month,
            COUNT(*)::int AS count
     FROM clinical_records
     WHERE doctor_id = :doctorId AND deleted_at IS NULL
       AND COALESCE(visit_date, created_at::date) >= (CURRENT_DATE - INTERVAL '12 months')
     GROUP BY 1 ORDER BY 1`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
}

function topVisitTypes(doctorId, limit = 8) {
  return sequelize.query(
    `SELECT UPPER(COALESCE(NULLIF(TRIM(visit_type), ''), 'Sin tipo')) AS type, COUNT(*)::int AS count
     FROM clinical_records
     WHERE doctor_id = :doctorId AND deleted_at IS NULL
     GROUP BY 1 ORDER BY count DESC LIMIT :limit`,
    { replacements: { doctorId, limit }, type: sequelize.QueryTypes.SELECT },
  );
}

function ageDistribution(doctorId) {
  return sequelize.query(
    `SELECT bucket, COUNT(*)::int AS count FROM (
       SELECT CASE
         WHEN age < 18 THEN '<18'
         WHEN age BETWEEN 18 AND 29 THEN '18-29'
         WHEN age BETWEEN 30 AND 39 THEN '30-39'
         WHEN age BETWEEN 40 AND 49 THEN '40-49'
         WHEN age BETWEEN 50 AND 64 THEN '50-64'
         ELSE '65+'
       END AS bucket
       FROM (
         SELECT date_part('year', age(birth_date))::int AS age
         FROM patients
         WHERE doctor_id = :doctorId AND birth_date IS NOT NULL AND deleted_at IS NULL
       ) a
     ) b
     GROUP BY bucket
     ORDER BY MIN(CASE bucket
       WHEN '<18' THEN 0 WHEN '18-29' THEN 1 WHEN '30-39' THEN 2
       WHEN '40-49' THEN 3 WHEN '50-64' THEN 4 ELSE 5 END)`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
}

module.exports = { totals, consultationsByMonth, topVisitTypes, ageDistribution };
