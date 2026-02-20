const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const patientId = Joi.string().guid({ version: 'uuidv4' });
const appointmentId = Joi.string().guid({ version: 'uuidv4' });

const createClinicalRecordSchema = Joi.object({
  patientId: patientId.required(),
  appointmentId: appointmentId.optional().allow(null),
  symptoms: Joi.string().required(),
  diagnosis: Joi.string().required(),
  treatment: Joi.string().required(),
  privateNotes: Joi.string().required(),
})
  .rename('patient_id', 'patientId', { ignoreUndefined: true })
  .rename('appointment_id', 'appointmentId', { ignoreUndefined: true })
  .rename('private_notes', 'privateNotes', { ignoreUndefined: true });

const getClinicalRecordsByPatientSchema = Joi.object({
  patientId: id.required(),
});

module.exports = {
  createClinicalRecordSchema,
  getClinicalRecordsByPatientSchema,
};
