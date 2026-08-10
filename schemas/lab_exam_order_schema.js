const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const orderExamSchema = Joi.object({
  examId: id.required(),
  patientId: id.required(),
  orderedRecordId: id.required(),
  orderedDate: dateOnly.optional(),
})
  .rename('exam_id', 'examId', { ignoreUndefined: true })
  .rename('patient_id', 'patientId', { ignoreUndefined: true })
  .rename('ordered_record_id', 'orderedRecordId', { ignoreUndefined: true })
  .rename('ordered_date', 'orderedDate', { ignoreUndefined: true });

const recordResultSchema = Joi.object({
  resultRecordId: id.required(),
  performedDate: dateOnly.optional().allow(null, ''),
  resultValue: Joi.string().max(500).optional().allow(null, ''),
  resultObservations: Joi.string().max(2000).optional().allow(null, ''),
})
  .rename('result_record_id', 'resultRecordId', { ignoreUndefined: true })
  .rename('performed_date', 'performedDate', { ignoreUndefined: true })
  .rename('result_value', 'resultValue', { ignoreUndefined: true })
  .rename('result_observations', 'resultObservations', { ignoreUndefined: true });

const getByPatientSchema = Joi.object({ patientId: id.required() });
const getByRecordSchema = Joi.object({ recordId: id.required() });
const getOrderSchema = Joi.object({ id: id.required() });

module.exports = { orderExamSchema, recordResultSchema, getByPatientSchema, getByRecordSchema, getOrderSchema };
