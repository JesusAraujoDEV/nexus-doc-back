const Joi = require('joi');

const email = Joi.string().email();
const password = Joi.string().min(8);
const role = Joi.string().valid('DOCTOR', 'ADMIN');

const loginAuthSchema = Joi.object({
  email: email.required(),
  password: password.required(),
});

const registerAuthSchema = Joi.object({
  email: email.required(),
  password: password.required(),
  role: role.required(),
});

module.exports = {
  loginAuthSchema,
  registerAuthSchema,
};
