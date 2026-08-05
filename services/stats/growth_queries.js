const sequelize = require('../../libs/sequelize');

// No se renderiza en el dashboard (redundante con "Este mes" + estacionalidad
// mensual, por decisión de data-experience-architect) — se deja disponible en
// la API por si se pide un reporte anual más adelante.
function newPatientsPerMonth(doctorId) {
  return sequelize.query(
    `SELECT to_char(date_trunc('month', p.created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
     FROM patients p
     WHERE p.doctor_id = :doctorId AND p.deleted_at IS NULL
       AND p.created_at >= (CURRENT_DATE - INTERVAL '12 months')
     GROUP BY 1 ORDER BY 1`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
}

module.exports = { newPatientsPerMonth };
