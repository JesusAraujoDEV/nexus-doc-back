const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const patientId = Joi.string().guid({ version: 'uuidv4' });
const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const lmpSource = Joi.string().valid('reported', 'estimated');

const newbornData = Joi.object({
    birthDate: dateOnly.optional().allow(null, ''),
    deliveryType: Joi.string().optional().allow(null, ''),
    name: Joi.string().optional().allow(null, ''),
    weight: Joi.number().optional().allow(null),
    length: Joi.number().optional().allow(null),
    medicalCenter: Joi.string().optional().allow(null, ''),
    admissionDate: dateOnly.optional().allow(null, ''),
    dischargeDate: dateOnly.optional().allow(null, ''),
    perinealInjury: Joi.string().optional().allow(null, ''),
    observations: Joi.string().optional().allow(null, ''),
}).optional().allow(null);

const createPregnancySchema = Joi.object({
    patientId: patientId.required(),
    pregnancyNumber: Joi.number().integer().min(1).optional(),
    lmpSource: lmpSource.optional(),
    lmpDate: dateOnly.optional().allow(null, ''),
    lmpReferenceDate: dateOnly.optional().allow(null, ''),
    lmpReferenceWeeks: Joi.number().integer().min(0).max(45).optional().allow(null),
    // No se limita a 0-6: en la práctica el reporte de ecografía a veces da los
    // días sin normalizar contra las semanas (ej. "13 semanas con 14 días").
    lmpReferenceDays: Joi.number().integer().min(0).max(30).optional().allow(null),
    fetalSex: Joi.string().valid('M', 'F', 'unknown').optional().allow(null),
    notes: Joi.string().optional().allow(null, ''),
})
    .rename('patient_id', 'patientId', { ignoreUndefined: true });

const updatePregnancySchema = Joi.object({
    lmpSource: lmpSource.optional(),
    lmpDate: dateOnly.optional().allow(null, ''),
    lmpReferenceDate: dateOnly.optional().allow(null, ''),
    lmpReferenceWeeks: Joi.number().integer().min(0).max(45).optional().allow(null),
    // No se limita a 0-6: en la práctica el reporte de ecografía a veces da los
    // días sin normalizar contra las semanas (ej. "13 semanas con 14 días").
    lmpReferenceDays: Joi.number().integer().min(0).max(30).optional().allow(null),
    fetalSex: Joi.string().valid('M', 'F', 'unknown').optional().allow(null),
    isFinalized: Joi.boolean().optional(),
    isLoss: Joi.boolean().optional(),
    isEctopic: Joi.boolean().optional(),
    newbornData,
    notes: Joi.string().optional().allow(null, ''),
})
    .rename('newborn_data', 'newbornData', { ignoreUndefined: true })
    .min(1);

const getPregnancySchema = Joi.object({ id: id.required() });
const getByPatientSchema = Joi.object({ patientId: id.required() });

module.exports = { createPregnancySchema, updatePregnancySchema, getPregnancySchema, getByPatientSchema };
