const Joi = require('joi');

const listCatalogSchema = Joi.object({
  search: Joi.string().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});

const catalogIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Un schema Joi de creación por catálogo (campos reales de cada modelo).
const CREATE_SCHEMAS = {
  'medical-centers': Joi.object({
    name: Joi.string().min(1).max(200).required(),
    address: Joi.string().max(500).optional().allow(null, ''),
  }),
  diagnoses: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    icd10Code: Joi.string().max(20).optional().allow(null, ''),
  }),
  medications: Joi.object({
    commercialName: Joi.string().min(1).max(200).required(),
    genericName: Joi.string().max(200).optional().allow(null, ''),
    presentation: Joi.string().max(200).optional().allow(null, ''),
  }),
  'lab-exams': Joi.object({
    name: Joi.string().min(1).max(200).required(),
    category: Joi.number().integer().min(1).max(5).optional().allow(null),
    isGroup: Joi.boolean().optional(),
  }).rename('is_group', 'isGroup', { ignoreUndefined: true }),
  labs: Joi.object({
    name: Joi.string().min(1).max(200).required(),
  }),
  icd10: Joi.object({
    code: Joi.string().max(20).optional().allow(null, ''),
    title: Joi.string().min(1).max(200).required(),
  }),
  'referring-doctors': Joi.object({
    name: Joi.string().min(1).max(200).required(),
    specialty: Joi.string().max(200).optional().allow(null, ''),
  }),
};

// Update = mismo schema con todos los campos opcionales (PATCH parcial) y al
// menos uno presente.
const UPDATE_SCHEMAS = Object.fromEntries(
  Object.entries(CREATE_SCHEMAS).map(([path, schema]) => [
    path,
    schema.fork(Object.keys(schema.describe().keys), (field) => field.optional()).min(1),
  ])
);

module.exports = { listCatalogSchema, catalogIdSchema, CREATE_SCHEMAS, UPDATE_SCHEMAS };
