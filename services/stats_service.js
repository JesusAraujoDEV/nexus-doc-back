const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const doctorService = new DoctorService();

class StatsService {
  async forDoctor(userId) {
    const doctor = await doctorService.findByUserId(userId);
    const doctorId = doctor.id;

    const [totals, byMonth, byType, byAge] = await Promise.all([
      this.totals(doctorId),
      this.consultationsByMonth(doctorId),
      this.topVisitTypes(doctorId),
      this.ageDistribution(doctorId),
    ]);

    return { totals, consultationsByMonth: byMonth, topVisitTypes: byType, ageDistribution: byAge };
  }

  async totals(doctorId) {
    const [row] = await sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM patients WHERE doctor_id = :doctorId) AS patients,
         (SELECT COUNT(*) FROM clinical_records WHERE doctor_id = :doctorId) AS consultations,
         (SELECT COUNT(*) FROM patients WHERE doctor_id = :doctorId AND birth_date IS NOT NULL) AS "withBirthDate",
         (SELECT COUNT(*) FROM clinical_records WHERE doctor_id = :doctorId
            AND created_at >= date_trunc('month', CURRENT_DATE)) AS "consultationsThisMonth"`,
      { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
    );
    return {
      patients: Number(row.patients),
      consultations: Number(row.consultations),
      withBirthDate: Number(row.withBirthDate),
      consultationsThisMonth: Number(row.consultationsThisMonth),
    };
  }

  async consultationsByMonth(doctorId) {
    return sequelize.query(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
       FROM clinical_records
       WHERE doctor_id = :doctorId AND created_at >= (CURRENT_DATE - INTERVAL '12 months')
       GROUP BY 1 ORDER BY 1`,
      { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
    );
  }

  async topVisitTypes(doctorId) {
    return sequelize.query(
      `SELECT UPPER(COALESCE(NULLIF(TRIM(visit_type), ''), 'Sin tipo')) AS type, COUNT(*)::int AS count
       FROM clinical_records
       WHERE doctor_id = :doctorId
       GROUP BY 1 ORDER BY count DESC LIMIT 8`,
      { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
    );
  }

  async ageDistribution(doctorId) {
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
           WHERE doctor_id = :doctorId AND birth_date IS NOT NULL
         ) a
       ) b
       GROUP BY bucket
       ORDER BY MIN(CASE bucket
         WHEN '<18' THEN 0 WHEN '18-29' THEN 1 WHEN '30-39' THEN 2
         WHEN '40-49' THEN 3 WHEN '50-64' THEN 4 ELSE 5 END)`,
      { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
    );
  }
}

module.exports = StatsService;
