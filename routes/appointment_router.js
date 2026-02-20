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

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Agendar cita
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, doctorId, serviceId, appointmentDate, startTime]
 *             properties:
 *               patientId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *               appointmentDate:
 *                 type: string
 *               startTime:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cita creada
 */
router.post(
  '/',
  validatorHandler(createAppointmentSchema, 'body'),
  (req, res, next) => controller.create(req, res, next)
);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Lista de citas del doctor por día/mes
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de citas
 */
router.get(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getAppointmentsQuerySchema, 'query'),
  (req, res, next) => controller.list(req, res, next)
);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Cambiar estado de cita
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *               isPaid:
 *                 type: boolean
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cita actualizada
 */
router.patch(
  '/:id/status',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getAppointmentSchema, 'params'),
  validatorHandler(updateAppointmentStatusSchema, 'body'),
  (req, res, next) => controller.updateStatus(req, res, next)
);

module.exports = router;
