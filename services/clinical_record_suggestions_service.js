const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const doctorService = new DoctorService();

/** Sugerencias basadas en lo que la doctora ya escribió antes, en vez de un catálogo fijo mantenido aparte. */
class ClinicalRecordSuggestionsService {
  async ultrasoundFieldValues(userId, field) {
    const doctor = await doctorService.findByUserId(userId);
    const [rows] = await sequelize.query(
      `SELECT ultrasound_findings ->> :field AS value, COUNT(*) AS count
       FROM clinical_records
       WHERE doctor_id = :doctorId AND deleted_at IS NULL AND ultrasound_findings ? :field
       GROUP BY value
       ORDER BY count DESC
       LIMIT 30`,
      { replacements: { doctorId: doctor.id, field } },
    );
    return rows.map((r) => ({ value: r.value, count: Number(r.count) }));
  }

  async medications(userId, search) {
    const doctor = await doctorService.findByUserId(userId);
    const [rows] = await sequelize.query(
      `SELECT item ->> 'nombre' AS nombre, item ->> 'posologia' AS posologia, COUNT(*) AS count
       FROM clinical_records, jsonb_array_elements(recipe_items) AS item
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
         AND recipe_items IS NOT NULL
         AND item ->> 'nombre' ILIKE :search
       GROUP BY nombre, posologia
       ORDER BY count DESC
       LIMIT 20`,
      { replacements: { doctorId: doctor.id, search: `%${search}%` } },
    );
    return rows.map((r) => ({ nombre: r.nombre, posologia: r.posologia, count: Number(r.count) }));
  }
}

module.exports = ClinicalRecordSuggestionsService;
