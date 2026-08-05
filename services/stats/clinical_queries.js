const sequelize = require('../../libs/sequelize');

/** Qué hace clínicamente: rankings de medicamentos/exámenes + edad en la primera visita. */
function topMedications(doctorId) {
  // treatment trae la lista de medicamentos separada por coma; se toma el
  // nombre antes del primer paréntesis (la dosis/presentación va entre ellos).
  return sequelize.query(
    `WITH meds AS (
       SELECT UPPER(TRIM(SPLIT_PART(TRIM(m), '(', 1))) AS nombre
       FROM clinical_records, unnest(string_to_array(treatment, ',')) AS m
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
         AND treatment IS NOT NULL AND treatment != ''
     )
     SELECT nombre AS name, COUNT(*)::int AS count
     FROM meds WHERE length(nombre) BETWEEN 3 AND 35
     GROUP BY 1 ORDER BY count DESC LIMIT 12`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
}

function topExams(doctorId) {
  return sequelize.query(
    `WITH exams AS (
       SELECT UPPER(TRIM(e)) AS nombre
       FROM clinical_records, unnest(string_to_array(lab_orders, ',')) AS e
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
         AND lab_orders IS NOT NULL AND lab_orders != ''
     )
     SELECT nombre AS name, COUNT(*)::int AS count
     FROM exams WHERE length(nombre) >= 3
     GROUP BY 1 ORDER BY count DESC LIMIT 12`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
}

function firstVisitAgeDistribution(doctorId) {
  return sequelize.query(
    `WITH first_visit AS (
       SELECT p.id, p.birth_date, MIN(COALESCE(cr.visit_date, cr.created_at::date)) AS first_date
       FROM patients p
       JOIN clinical_records cr ON cr.patient_id = p.id AND cr.deleted_at IS NULL
       WHERE p.doctor_id = :doctorId AND p.birth_date IS NOT NULL AND p.deleted_at IS NULL
       GROUP BY p.id, p.birth_date
     )
     SELECT bucket, COUNT(*)::int AS count FROM (
       SELECT CASE
         WHEN age < 18 THEN '<18'
         WHEN age BETWEEN 18 AND 29 THEN '18-29'
         WHEN age BETWEEN 30 AND 39 THEN '30-39'
         WHEN age BETWEEN 40 AND 49 THEN '40-49'
         WHEN age BETWEEN 50 AND 64 THEN '50-64'
         ELSE '65+'
       END AS bucket
       FROM (SELECT date_part('year', age(first_date, birth_date))::int AS age FROM first_visit) a
     ) b
     GROUP BY bucket
     ORDER BY MIN(CASE bucket
       WHEN '<18' THEN 0 WHEN '18-29' THEN 1 WHEN '30-39' THEN 2
       WHEN '40-49' THEN 3 WHEN '50-64' THEN 4 ELSE 5 END)`,
    { replacements: { doctorId }, type: sequelize.QueryTypes.SELECT },
  );
}

module.exports = { topMedications, topExams, firstVisitAgeDistribution };
