const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  createClinicalRecordSchema,
  getClinicalRecordsByPatientSchema,
} = require('../schemas/clinical_record_schema');
const ClinicalRecordController = require('../controllers/clinical_record_controller');

const router = express.Router();
const controller = new ClinicalRecordController();

/**
 * @swagger
 * /api/clinical-records:
 *   post:
 *     summary: Crear evolución médica
 *     tags: [ClinicalRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, symptoms, diagnosis, treatment, privateNotes]
 *             properties:
 *               patientId:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               symptoms:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               treatment:
 *                 type: string
 *               privateNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Evolución creada
 */
router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createClinicalRecordSchema, 'body'),
  (req, res, next) => controller.create(req, res, next)
);

/**
 * @swagger
 * /api/clinical-records/patient/{patientId}:
 *   get:
 *     summary: Historial clínico por paciente
 *     tags: [ClinicalRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evoluciones
 */
router.get(
  '/patient/:patientId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getClinicalRecordsByPatientSchema, 'params'),
  (req, res, next) => controller.listByPatient(req, res, next)
);

module.exports = router;
