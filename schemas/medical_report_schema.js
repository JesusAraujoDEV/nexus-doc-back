const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });

const createMedicalReportSchema = Joi.object({
  clinicalRecordId: id.required(),
  patientId: id.required(),
  type: Joi.string().valid('informe', 'constancia').required(),
  title: Joi.string().max(300).optional().allow(null, ''),
  referringDoctorId: id.optional().allow(null),
  medicalCenterId: id.optional().allow(null),
  content: Joi.string().max(20000).optional().allow(null, ''),
  constanciaText: Joi.string().max(2000).optional().allow(null, ''),
  realizandoseText: Joi.string().max(2000).optional().allow(null, ''),
  indicatesRest: Joi.boolean().optional(),
})
  .rename('clinical_record_id', 'clinicalRecordId', { ignoreUndefined: true })
  .rename('patient_id', 'patientId', { ignoreUndefined: true })
  .rename('referring_doctor_id', 'referringDoctorId', { ignoreUndefined: true })
  .rename('medical_center_id', 'medicalCenterId', { ignoreUndefined: true })
  .rename('constancia_text', 'constanciaText', { ignoreUndefined: true })
  .rename('realizandose_text', 'realizandoseText', { ignoreUndefined: true })
  .rename('indicates_rest', 'indicatesRest', { ignoreUndefined: true });

const updateMedicalReportSchema = Joi.object({
  title: Joi.string().max(300).optional().allow(null, ''),
  referringDoctorId: id.optional().allow(null),
  medicalCenterId: id.optional().allow(null),
  content: Joi.string().max(20000).optional().allow(null, ''),
  constanciaText: Joi.string().max(2000).optional().allow(null, ''),
  realizandoseText: Joi.string().max(2000).optional().allow(null, ''),
  indicatesRest: Joi.boolean().optional(),
})
  .rename('referring_doctor_id', 'referringDoctorId', { ignoreUndefined: true })
  .rename('medical_center_id', 'medicalCenterId', { ignoreUndefined: true })
  .rename('constancia_text', 'constanciaText', { ignoreUndefined: true })
  .rename('realizandose_text', 'realizandoseText', { ignoreUndefined: true })
  .rename('indicates_rest', 'indicatesRest', { ignoreUndefined: true })
  .min(1);

const getByRecordSchema = Joi.object({ recordId: id.required() });
const getMedicalReportSchema = Joi.object({ id: id.required() });

module.exports = {
  createMedicalReportSchema,
  updateMedicalReportSchema,
  getByRecordSchema,
  getMedicalReportSchema,
};
