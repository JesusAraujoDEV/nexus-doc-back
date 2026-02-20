const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  getAppointmentSchema,
  getAppointmentsQuerySchema,
} = require('../schemas/appointment_schema');
const AppointmentController = require('../controllers/appointment_controller');

const router = express.Router();
const controller = new AppointmentController();

router.post(
  '/',
  validatorHandler(createAppointmentSchema, 'body'),
  (req, res, next) => controller.create(req, res, next)
);

router.get(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getAppointmentsQuerySchema, 'query'),
  (req, res, next) => controller.list(req, res, next)
);

router.patch(
  '/:id/status',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getAppointmentSchema, 'params'),
  validatorHandler(updateAppointmentStatusSchema, 'body'),
  (req, res, next) => controller.updateStatus(req, res, next)
);

module.exports = router;
