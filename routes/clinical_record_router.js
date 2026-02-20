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

router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createClinicalRecordSchema, 'body'),
  (req, res, next) => controller.create(req, res, next)
);

router.get(
  '/patient/:patientId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getClinicalRecordsByPatientSchema, 'params'),
  (req, res, next) => controller.listByPatient(req, res, next)
);

module.exports = router;
