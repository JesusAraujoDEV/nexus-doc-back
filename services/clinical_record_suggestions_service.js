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

  async generalUltrasoundFieldValues(userId, field) {
    const doctor = await doctorService.findByUserId(userId);
    const [rows] = await sequelize.query(
      `SELECT findings ->> :field AS value, COUNT(*) AS count
       FROM general_ultrasounds gu
       JOIN clinical_records cr ON cr.id = gu.clinical_record_id
       WHERE cr.doctor_id = :doctorId AND gu.deleted_at IS NULL AND findings ? :field
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
      `SELECT item ->> 'nombre' AS nombre, item ->> 'comercial' AS comercial, item ->> 'posologia' AS posologia, COUNT(*) AS count
       FROM clinical_records, jsonb_array_elements(recipe_items) AS item
       WHERE doctor_id = :doctorId AND deleted_at IS NULL
         AND recipe_items IS NOT NULL
         AND item ->> 'nombre' ILIKE :search
       GROUP BY nombre, comercial, posologia
       ORDER BY count DESC
       LIMIT 20`,
      { replacements: { doctorId: doctor.id, search: `%${search}%` } },
    );
    return rows.map((r) => ({ nombre: r.nombre, comercial: r.comercial, posologia: r.posologia, count: Number(r.count) }));
  }
}

module.exports = ClinicalRecordSuggestionsService;
