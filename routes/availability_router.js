const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { getAvailabilityParamsSchema, getAvailabilityQuerySchema } = require('../schemas/availability_schema');
const AvailabilityController = require('../controllers/availability_controller');

const router = express.Router();
const controller = new AvailabilityController();

router.get(
  '/:doctorId',
  validatorHandler(getAvailabilityParamsSchema, 'params'),
  validatorHandler(getAvailabilityQuerySchema, 'query'),
  (req, res, next) => controller.getAvailability(req, res, next)
);

module.exports = router;
