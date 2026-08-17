const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  orderExamSchema,
  recordResultSchema,
  getByPatientSchema,
  getByRecordSchema,
  getOrderSchema,
} = require('../schemas/lab_exam_order_schema');
const LabExamOrderController = require('../controllers/lab_exam_order_controller');

const router = express.Router();
const controller = new LabExamOrderController();

router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(orderExamSchema, 'body'),
  (req, res, next) => controller.order(req, res, next)
);

router.get(
  '/patient/:patientId/pending',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getByPatientSchema, 'params'),
  (req, res, next) => controller.pendingForPatient(req, res, next)
);

router.get(
  '/patient/:patientId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getByPatientSchema, 'params'),
  (req, res, next) => controller.allForPatient(req, res, next)
);

router.get(
  '/record/:recordId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getByRecordSchema, 'params'),
  (req, res, next) => controller.byRecord(req, res, next)
);

router.patch(
  '/:id/result',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getOrderSchema, 'params'),
  validatorHandler(recordResultSchema, 'body'),
  (req, res, next) => controller.recordResult(req, res, next)
);

router.delete(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getOrderSchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

module.exports = router;
