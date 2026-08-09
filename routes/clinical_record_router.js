const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  createClinicalRecordSchema,
  getClinicalRecordsByPatientSchema,
  updateClinicalRecordSchema,
  getClinicalRecordSchema,
  ultrasoundSuggestionsSchema,
  medicationSuggestionsSchema,
} = require('../schemas/clinical_record_schema');
const ClinicalRecordController = require('../controllers/clinical_record_controller');
const ClinicalRecordSuggestionsController = require('../controllers/clinical_record_suggestions_controller');

const router = express.Router();
const controller = new ClinicalRecordController();
const suggestionsController = new ClinicalRecordSuggestionsController();

router.get(
  '/suggestions/ultrasound',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(ultrasoundSuggestionsSchema, 'query'),
  (req, res, next) => suggestionsController.ultrasoundFieldValues(req, res, next)
);

router.get(
  '/suggestions/medications',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(medicationSuggestionsSchema, 'query'),
  (req, res, next) => suggestionsController.medications(req, res, next)
);

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

router.patch(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getClinicalRecordSchema, 'params'),
  validatorHandler(updateClinicalRecordSchema, 'body'),
  (req, res, next) => controller.update(req, res, next)
);

router.delete(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getClinicalRecordSchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

router.get(
  '/:id/prescription-pdf',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getClinicalRecordSchema, 'params'),
  (req, res, next) => controller.prescriptionPdf(req, res, next)
);

router.get(
  '/:id/ultrasound-pdf',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getClinicalRecordSchema, 'params'),
  (req, res, next) => controller.ultrasoundPdf(req, res, next)
);

module.exports = router;
