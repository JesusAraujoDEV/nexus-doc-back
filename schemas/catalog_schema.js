const Joi = require('joi');

const listCatalogSchema = Joi.object({
  search: Joi.string().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

module.exports = { listCatalogSchema };
