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
  labOrders: Joi.string().optional().allow(null, ''),
  visitType: Joi.string().optional().allow(null, ''),
  visitDate: Joi.date().optional().allow(null),
})
  .rename('patient_id', 'patientId', { ignoreUndefined: true })
  .rename('appointment_id', 'appointmentId', { ignoreUndefined: true })
  .rename('private_notes', 'privateNotes', { ignoreUndefined: true })
  .rename('lab_orders', 'labOrders', { ignoreUndefined: true })
  .rename('visit_type', 'visitType', { ignoreUndefined: true })
  .rename('visit_date', 'visitDate', { ignoreUndefined: true });

const getClinicalRecordsByPatientSchema = Joi.object({
  patientId: id.required(),
});

const updateClinicalRecordSchema = Joi.object({
  symptoms: Joi.string().optional().allow(null, ''),
  diagnosis: Joi.string().optional().allow(null, ''),
  treatment: Joi.string().optional().allow(null, ''),
  privateNotes: Joi.string().optional().allow(null, ''),
  labOrders: Joi.string().optional().allow(null, ''),
  visitType: Joi.string().optional().allow(null, ''),
  visitDate: Joi.date().optional().allow(null),
})
  .rename('private_notes', 'privateNotes', { ignoreUndefined: true })
  .rename('lab_orders', 'labOrders', { ignoreUndefined: true })
  .rename('visit_type', 'visitType', { ignoreUndefined: true })
  .rename('visit_date', 'visitDate', { ignoreUndefined: true })
  .min(1);

const getClinicalRecordSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

module.exports = {
  createClinicalRecordSchema,
  getClinicalRecordsByPatientSchema,
  updateClinicalRecordSchema,
  getClinicalRecordSchema,
};
