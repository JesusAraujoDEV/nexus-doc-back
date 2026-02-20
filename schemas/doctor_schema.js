const Joi = require('joi');

const slug = Joi.string().min(3);

const getDoctorBySlugSchema = Joi.object({
  slug: slug.required(),
});

module.exports = { getDoctorBySlugSchema };
