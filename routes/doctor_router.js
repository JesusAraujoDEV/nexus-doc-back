const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { getDoctorBySlugSchema } = require('../schemas/doctor_schema');
const DoctorController = require('../controllers/doctor_controller');

const router = express.Router();
const controller = new DoctorController();

/**
 * @swagger
 * /api/doctors/{slug}:
 *   get:
 *     summary: Obtener perfil público de doctor por slug
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Perfil del doctor con servicios activos
 */
router.get(
  '/:slug',
  validatorHandler(getDoctorBySlugSchema, 'params'),
  (req, res, next) => controller.getBySlug(req, res, next)
);

module.exports = router;
