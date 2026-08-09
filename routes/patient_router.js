const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { createPatientSchema, getPatientSchema, listPatientsSchema, updatePatientSchema } = require('../schemas/patient_schema');
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
  validatorHandler(listPatientsSchema, 'query'),
  (req, res, next) => controller.list(req, res, next)
);

router.get(
  '/trash',
  authenticateJwt,
  checkRoles('DOCTOR'),
  (req, res, next) => controller.trash(req, res, next)
);

router.post(
  '/:id/restore',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPatientSchema, 'params'),
  (req, res, next) => controller.restore(req, res, next)
);

router.get(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPatientSchema, 'params'),
  (req, res, next) => controller.getById(req, res, next)
);

router.patch(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPatientSchema, 'params'),
  validatorHandler(updatePatientSchema, 'body'),
  (req, res, next) => controller.update(req, res, next)
);

router.delete(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPatientSchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

module.exports = router;
