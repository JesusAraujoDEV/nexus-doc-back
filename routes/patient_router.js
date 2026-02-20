const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { createPatientSchema, getPatientSchema } = require('../schemas/patient_schema');
const PatientController = require('../controllers/patient_controller');

const router = express.Router();
const controller = new PatientController();

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Registro rápido de paciente
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, cedula, phone]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               cedula:
 *                 type: string
 *               phone:
 *                 type: string
 *               birthDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Paciente creado
 */
router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createPatientSchema, 'body'),
  (req, res, next) => controller.createQuick(req, res, next)
);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Lista CRM de pacientes con conteo de citas
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pacientes
 */
router.get(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  (req, res, next) => controller.list(req, res, next)
);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Perfil detallado de paciente
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Perfil del paciente
 */
router.get(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPatientSchema, 'params'),
  (req, res, next) => controller.getById(req, res, next)
);

module.exports = router;
