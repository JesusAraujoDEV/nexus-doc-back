const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { createPatientSchema, getPatientSchema } = require('../schemas/patient_schema');
const PatientController = require('../controllers/patient_controller');

const router = express.Router();
const controller = new PatientController();

router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createPatientSchema, 'body'),
  (req, res, next) => controller.createQuick(req, res, next)
);

router.get(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  (req, res, next) => controller.list(req, res, next)
);

router.get(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPatientSchema, 'params'),
  (req, res, next) => controller.getById(req, res, next)
);

module.exports = router;
