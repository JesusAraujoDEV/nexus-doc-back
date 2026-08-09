const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const firstName = Joi.string().min(2);
const lastName = Joi.string().min(2);
const cedula = Joi.string().min(5).max(20);
const phone = Joi.string().min(6).max(20);
const birthDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const referredByType = Joi.string().valid('redes', 'otro_doctor', 'colega', 'amigo', 'otro');

const createPatientSchema = Joi.object({
  firstName: firstName.required(),
  lastName: lastName.required(),
  cedula: cedula.required(),
  phone: phone.required(),
  birthDate: birthDate.optional(),
  address: Joi.string().max(500).optional().allow(null, ''),
  referredByType: referredByType.optional().allow(null),
  referredByDetail: Joi.string().max(500).optional().allow(null, ''),
  medicalBackground: Joi.object().optional().allow(null),
})
  .rename('first_name', 'firstName', { ignoreUndefined: true })
  .rename('last_name', 'lastName', { ignoreUndefined: true })
  .rename('birth_date', 'birthDate', { ignoreUndefined: true })
  .rename('referred_by_type', 'referredByType', { ignoreUndefined: true })
  .rename('referred_by_detail', 'referredByDetail', { ignoreUndefined: true })
  .rename('medical_background', 'medicalBackground', { ignoreUndefined: true });

const getPatientSchema = Joi.object({
  id: id.required(),
});

const listPatientsSchema = Joi.object({
  search: Joi.string().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('name', 'cedula', 'createdAt', 'visitsCount', 'lastVisit').optional(),
  sortDir: Joi.string().valid('ASC', 'DESC').optional(),
  gender: Joi.string().valid('Femenino', 'Masculino').optional(),
  hasVisits: Joi.string().valid('true', 'false').optional(),
  hasCedula: Joi.string().valid('true', 'false').optional(),
});

const updatePatientSchema = Joi.object({
  firstName: firstName.optional(),
  lastName: lastName.optional(),
  cedula: Joi.string().min(1).max(20).optional().allow(null),
  phone: phone.optional().allow(null, ''),
  birthDate: birthDate.optional().allow(null),
  gender: Joi.string().valid('Femenino', 'Masculino').optional().allow(null),
  bloodType: Joi.string().max(5).optional().allow(null, ''),
  address: Joi.string().max(500).optional().allow(null, ''),
  historyNumber: Joi.string().max(20).optional().allow(null, ''),
  medicalBackground: Joi.object().optional().allow(null),
  referredByType: referredByType.optional().allow(null),
  referredByDetail: Joi.string().max(500).optional().allow(null, ''),
})
  .rename('first_name', 'firstName', { ignoreUndefined: true })
  .rename('last_name', 'lastName', { ignoreUndefined: true })
  .rename('birth_date', 'birthDate', { ignoreUndefined: true })
  .rename('blood_type', 'bloodType', { ignoreUndefined: true })
  .rename('history_number', 'historyNumber', { ignoreUndefined: true })
  .rename('medical_background', 'medicalBackground', { ignoreUndefined: true })
  .rename('referred_by_type', 'referredByType', { ignoreUndefined: true })
  .rename('referred_by_detail', 'referredByDetail', { ignoreUndefined: true })
  .min(1); // al menos un campo

module.exports = { createPatientSchema, getPatientSchema, listPatientsSchema, updatePatientSchema };
