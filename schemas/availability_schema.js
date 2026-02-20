const Joi = require('joi');

const doctorId = Joi.string().guid({ version: 'uuidv4' });
const date = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const getAvailabilityParamsSchema = Joi.object({
  doctorId: doctorId.required(),
});

const getAvailabilityQuerySchema = Joi.object({
  date: date.required(),
});

module.exports = {
  getAvailabilityParamsSchema,
  getAvailabilityQuerySchema,
};
