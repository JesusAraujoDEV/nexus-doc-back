const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  createPregnancySchema,
  updatePregnancySchema,
  getPregnancySchema,
  getByPatientSchema,
} = require('../schemas/pregnancy_schema');
const PregnancyController = require('../controllers/pregnancy_controller');

const router = express.Router();
const controller = new PregnancyController();

router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createPregnancySchema, 'body'),
  (req, res, next) => controller.create(req, res, next)
);

router.get(
  '/trash',
  authenticateJwt,
  checkRoles('DOCTOR'),
  (req, res, next) => controller.trash(req, res, next)
);

router.get(
  '/patient/:patientId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getByPatientSchema, 'params'),
  (req, res, next) => controller.listByPatient(req, res, next)
);

router.get(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPregnancySchema, 'params'),
  (req, res, next) => controller.getById(req, res, next)
);

router.get(
  '/:id/pdf',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPregnancySchema, 'params'),
  (req, res, next) => controller.pdf(req, res, next)
);

router.patch(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPregnancySchema, 'params'),
  validatorHandler(updatePregnancySchema, 'body'),
  (req, res, next) => controller.update(req, res, next)
);

router.delete(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPregnancySchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

router.post(
  '/:id/restore',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getPregnancySchema, 'params'),
  (req, res, next) => controller.restore(req, res, next)
);

module.exports = router;
