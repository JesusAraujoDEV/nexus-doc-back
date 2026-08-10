const Joi = require('joi');

const listCatalogSchema = Joi.object({
  search: Joi.string().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

const createLabExamSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  category: Joi.number().integer().min(1).max(5).optional().allow(null),
  isGroup: Joi.boolean().optional(),
})
  .rename('is_group', 'isGroup', { ignoreUndefined: true });

module.exports = { listCatalogSchema, createLabExamSchema };
