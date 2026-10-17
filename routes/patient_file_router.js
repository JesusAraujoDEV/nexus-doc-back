const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { singleFile } = require('../middlewares/upload_handler');
const {
  recordParamsSchema,
  patientParamsSchema,
  fileParamsSchema,
  renameFileSchema,
} = require('../schemas/patient_file_schema');
const PatientFileController = require('../controllers/patient_file_controller');

const router = express.Router();
const controller = new PatientFileController();
const doctorOnly = [authenticateJwt, checkRoles('DOCTOR')];

// multipart/form-data con un campo `file`.
router.post(
  '/record/:recordId',
  ...doctorOnly,
  validatorHandler(recordParamsSchema, 'params'),
  singleFile,
  (req, res, next) => controller.upload(req, res, next)
);

router.get(
  '/record/:recordId',
  ...doctorOnly,
  validatorHandler(recordParamsSchema, 'params'),
  (req, res, next) => controller.byRecord(req, res, next)
);

router.get(
  '/patient/:patientId',
  ...doctorOnly,
  validatorHandler(patientParamsSchema, 'params'),
  (req, res, next) => controller.byPatient(req, res, next)
);

router.get('/trash', ...doctorOnly, (req, res, next) => controller.trash(req, res, next));

router.get(
  '/:id/content',
  ...doctorOnly,
  validatorHandler(fileParamsSchema, 'params'),
  (req, res, next) => controller.content(req, res, next)
);

router.patch(
  '/:id',
  ...doctorOnly,
  validatorHandler(fileParamsSchema, 'params'),
  validatorHandler(renameFileSchema, 'body'),
  (req, res, next) => controller.rename(req, res, next)
);

router.delete(
  '/:id',
  ...doctorOnly,
  validatorHandler(fileParamsSchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

router.post(
  '/:id/restore',
  ...doctorOnly,
  validatorHandler(fileParamsSchema, 'params'),
  (req, res, next) => controller.restore(req, res, next)
);

module.exports = router;
