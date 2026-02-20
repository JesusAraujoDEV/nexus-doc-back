const express = require('express');

const authRouter = require('./auth_router');
const doctorRouter = require('./doctor_router');
const availabilityRouter = require('./availability_router');
const patientRouter = require('./patient_router');
const appointmentRouter = require('./appointment_router');
const clinicalRecordRouter = require('./clinical_record_router');

function routerApi(app) {
  const router = express.Router();
  app.use('/api', router);
  router.use('/auth', authRouter);
  router.use('/doctors', doctorRouter);
  router.use('/availability', availabilityRouter);
  router.use('/patients', patientRouter);
  router.use('/appointments', appointmentRouter);
  router.use('/clinical-records', clinicalRecordRouter);
}

module.exports = routerApi;
