const Joi = require('joi');

const id = Joi.string().guid({ version: 'uuidv4' });
const patientId = Joi.string().guid({ version: 'uuidv4' });
const doctorId = Joi.string().guid({ version: 'uuidv4' });
const serviceId = Joi.string().guid({ version: 'uuidv4' });
const appointmentDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
const time = Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/);
const status = Joi.string().valid('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA');
const paymentMethod = Joi.string().valid('ZELLE', 'PAGO_MOVIL', 'EFECTIVO', 'SEGURO');

const createAppointmentSchema = Joi.object({
  patientId: patientId.required(),
  doctorId: doctorId.required(),
  serviceId: serviceId.required(),
  appointmentDate: appointmentDate.required(),
  startTime: time.required(),
})
  .rename('patient_id', 'patientId', { ignoreUndefined: true })
  .rename('doctor_id', 'doctorId', { ignoreUndefined: true })
  .rename('service_id', 'serviceId', { ignoreUndefined: true })
  .rename('appointment_date', 'appointmentDate', { ignoreUndefined: true })
  .rename('start_time', 'startTime', { ignoreUndefined: true });

const updateAppointmentStatusSchema = Joi.object({
  status: status.required(),
  isPaid: Joi.boolean().optional(),
  paymentMethod: paymentMethod.optional().allow(null),
})
  .rename('is_paid', 'isPaid', { ignoreUndefined: true })
  .rename('payment_method', 'paymentMethod', { ignoreUndefined: true });

const getAppointmentSchema = Joi.object({
  id: id.required(),
});

const getAppointmentsQuerySchema = Joi.object({
  date: appointmentDate.optional(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  getAppointmentSchema,
  getAppointmentsQuerySchema,
};
