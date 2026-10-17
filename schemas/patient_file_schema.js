const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });

const recordParamsSchema = Joi.object({ recordId: id.required() });
const patientParamsSchema = Joi.object({ patientId: id.required() });
const fileParamsSchema = Joi.object({ id: id.required() });
const renameFileSchema = Joi.object({ fileName: Joi.string().trim().min(1).max(200).required() });

module.exports = { recordParamsSchema, patientParamsSchema, fileParamsSchema, renameFileSchema };
