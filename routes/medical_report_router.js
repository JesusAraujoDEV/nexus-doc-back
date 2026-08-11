const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  createMedicalReportSchema,
  updateMedicalReportSchema,
  getByRecordSchema,
  getMedicalReportSchema,
} = require('../schemas/medical_report_schema');
const MedicalReportController = require('../controllers/medical_report_controller');

const router = express.Router();
const controller = new MedicalReportController();

router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createMedicalReportSchema, 'body'),
  (req, res, next) => controller.create(req, res, next)
);

router.get(
  '/record/:recordId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getByRecordSchema, 'params'),
  (req, res, next) => controller.byRecord(req, res, next)
);

router.get(
  '/:id/pdf',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getMedicalReportSchema, 'params'),
  (req, res, next) => controller.pdf(req, res, next)
);

router.patch(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getMedicalReportSchema, 'params'),
  validatorHandler(updateMedicalReportSchema, 'body'),
  (req, res, next) => controller.update(req, res, next)
);

router.delete(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getMedicalReportSchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

module.exports = router;
