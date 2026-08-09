const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const patientId = Joi.string().guid({ version: 'uuidv4' });
const appointmentId = Joi.string().guid({ version: 'uuidv4' });

// Joi.date() convierte a un objeto Date de JS que después Sequelize formatea en
// hora LOCAL del server para una columna DATEONLY - si el server no corre en UTC,
// una fecha enviada como "2026-09-01" puede terminar guardada como "2026-08-31".
// String plano (mismo patrón que patients.birth_date) evita el problema entero.
const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const recipeItem = Joi.object({
  nombre: Joi.string().required(),
  comercial: Joi.string().optional().allow(null, ''),
  posologia: Joi.string().optional().allow(null, ''),
});
const recipeItems = Joi.array().items(recipeItem).optional().allow(null);
const ultrasoundFindings = Joi.object().pattern(Joi.string(), Joi.alternatives(Joi.string(), Joi.number())).optional().allow(null);

const createClinicalRecordSchema = Joi.object({
  patientId: patientId.required(),
  appointmentId: appointmentId.optional().allow(null),
  // Solo el diagnóstico es obligatorio: motivo/tratamiento/observaciones quedan
  // vacíos en consultas reales (ej. una consulta que fue solo ecografía).
  symptoms: Joi.string().optional().allow(null, ''),
  diagnosis: Joi.string().required(),
  treatment: Joi.string().optional().allow(null, ''),
  privateNotes: Joi.string().optional().allow(null, ''),
  labOrders: Joi.string().optional().allow(null, ''),
  visitType: Joi.string().optional().allow(null, ''),
  visitDate: dateOnly.optional().allow(null),
  recipeItems,
  ultrasoundFindings,
  nextAppointmentDate: dateOnly.optional().allow(null),
})
  .rename('patient_id', 'patientId', { ignoreUndefined: true })
  .rename('appointment_id', 'appointmentId', { ignoreUndefined: true })
  .rename('private_notes', 'privateNotes', { ignoreUndefined: true })
  .rename('lab_orders', 'labOrders', { ignoreUndefined: true })
  .rename('visit_type', 'visitType', { ignoreUndefined: true })
  .rename('visit_date', 'visitDate', { ignoreUndefined: true })
  .rename('recipe_items', 'recipeItems', { ignoreUndefined: true })
  .rename('ultrasound_findings', 'ultrasoundFindings', { ignoreUndefined: true })
  .rename('next_appointment_date', 'nextAppointmentDate', { ignoreUndefined: true });

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
  visitDate: dateOnly.optional().allow(null),
  recipeItems,
  ultrasoundFindings,
  nextAppointmentDate: dateOnly.optional().allow(null),
})
  .rename('private_notes', 'privateNotes', { ignoreUndefined: true })
  .rename('lab_orders', 'labOrders', { ignoreUndefined: true })
  .rename('visit_type', 'visitType', { ignoreUndefined: true })
  .rename('visit_date', 'visitDate', { ignoreUndefined: true })
  .rename('recipe_items', 'recipeItems', { ignoreUndefined: true })
  .rename('ultrasound_findings', 'ultrasoundFindings', { ignoreUndefined: true })
  .rename('next_appointment_date', 'nextAppointmentDate', { ignoreUndefined: true })
  .min(1);

const getClinicalRecordSchema = Joi.object({
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
});

const ultrasoundSuggestionsSchema = Joi.object({
  field: Joi.string().required(),
});

const medicationSuggestionsSchema = Joi.object({
  q: Joi.string().min(1).required(),
});

module.exports = {
  createClinicalRecordSchema,
  getClinicalRecordsByPatientSchema,
  updateClinicalRecordSchema,
  getClinicalRecordSchema,
  ultrasoundSuggestionsSchema,
  medicationSuggestionsSchema,
};
