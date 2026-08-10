const Joi = require('joi');
const { GENERAL_ULTRASOUND_SUB_TYPES } = require('../libs/general-ultrasound-types');

const id = Joi.string().guid({ version: 'uuidv4' });

const saveGeneralUltrasoundSchema = Joi.object({
  clinicalRecordId: id.required(),
  subType: Joi.string().valid(...GENERAL_ULTRASOUND_SUB_TYPES).required(),
  findings: Joi.object().unknown(true).required(),
})
  .rename('clinical_record_id', 'clinicalRecordId', { ignoreUndefined: true })
  .rename('sub_type', 'subType', { ignoreUndefined: true });

const getByRecordSchema = Joi.object({ recordId: id.required() });
const getGeneralUltrasoundSchema = Joi.object({ id: id.required() });

module.exports = { saveGeneralUltrasoundSchema, getByRecordSchema, getGeneralUltrasoundSchema };
