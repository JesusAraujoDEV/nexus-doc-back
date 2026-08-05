const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const firstName = Joi.string().min(2);
const lastName = Joi.string().min(2);
const cedula = Joi.string().min(5).max(20);
const phone = Joi.string().min(6).max(20);
const birthDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const createPatientSchema = Joi.object({
  firstName: firstName.required(),
  lastName: lastName.required(),
  cedula: cedula.required(),
  phone: phone.required(),
  birthDate: birthDate.optional(),
})
  .rename('first_name', 'firstName', { ignoreUndefined: true })
  .rename('last_name', 'lastName', { ignoreUndefined: true })
  .rename('birth_date', 'birthDate', { ignoreUndefined: true });

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
});

module.exports = { createPatientSchema, getPatientSchema, listPatientsSchema };
