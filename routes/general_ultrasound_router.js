const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const {
  saveGeneralUltrasoundSchema,
  getByRecordSchema,
  getGeneralUltrasoundSchema,
} = require('../schemas/general_ultrasound_schema');
const GeneralUltrasoundController = require('../controllers/general_ultrasound_controller');

const router = express.Router();
const controller = new GeneralUltrasoundController();

router.post(
  '/',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(saveGeneralUltrasoundSchema, 'body'),
  (req, res, next) => controller.save(req, res, next)
);

router.get(
  '/record/:recordId',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getByRecordSchema, 'params'),
  (req, res, next) => controller.byRecord(req, res, next)
);

router.delete(
  '/:id',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(getGeneralUltrasoundSchema, 'params'),
  (req, res, next) => controller.remove(req, res, next)
);

module.exports = router;
