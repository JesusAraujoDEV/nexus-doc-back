const sequelize = require('../../libs/sequelize');

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Cuándo atiende: mismo tipo de dato (distribución temporal) en tres granularidades. */
async function consultationsByDayOfWeek(doctorId) {
  const rows = await sequelize.query(
    `SELECT EXTRACT(DOW FROM COALESCE(visit_date, created_at::date))::int AS dow, COUNT(*)::int AS count
     FROM clinical_records
     WHERE doctor_id = :doctorId AND deleted_at IS NULL
     GROUP BY 1 ORDER BY 1`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return rows.map((r) => ({ label: DIAS[r.dow], count: r.count }));
}

async function consultationsByMonthOfYear(doctorId) {
  const rows = await sequelize.query(
    `SELECT EXTRACT(MONTH FROM COALESCE(visit_date, created_at::date))::int AS m, COUNT(*)::int AS count
     FROM clinical_records
     WHERE doctor_id = :doctorId AND deleted_at IS NULL
     GROUP BY 1 ORDER BY 1`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return rows.map((r) => ({ label: MESES[r.m - 1], count: r.count }));
}

async function consultationsByYear(doctorId) {
  const rows = await sequelize.query(
    `SELECT EXTRACT(YEAR FROM COALESCE(visit_date, created_at::date))::int AS year, COUNT(*)::int AS count
     FROM clinical_records
     WHERE doctor_id = :doctorId AND deleted_at IS NULL
     GROUP BY 1 ORDER BY 1`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
  return rows.map((r) => ({ label: String(r.year), count: r.count }));
}

module.exports = { consultationsByDayOfWeek, consultationsByMonthOfYear, consultationsByYear };
