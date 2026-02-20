const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { getDoctorBySlugSchema } = require('../schemas/doctor_schema');
const DoctorController = require('../controllers/doctor_controller');

const router = express.Router();
const controller = new DoctorController();

router.get(
  '/:slug',
  validatorHandler(getDoctorBySlugSchema, 'params'),
  (req, res, next) => controller.getBySlug(req, res, next)
);

module.exports = router;
