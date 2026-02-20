const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { getAvailabilityParamsSchema, getAvailabilityQuerySchema } = require('../schemas/availability_schema');
const AvailabilityController = require('../controllers/availability_controller');

const router = express.Router();
const controller = new AvailabilityController();

/**
 * @swagger
 * /api/availability/{doctorId}:
 *   get:
 *     summary: Obtener disponibilidad por doctor y fecha
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-02-20
 *     responses:
 *       200:
 *         description: Array de horas disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get(
  '/:doctorId',
  validatorHandler(getAvailabilityParamsSchema, 'params'),
  validatorHandler(getAvailabilityQuerySchema, 'query'),
  (req, res, next) => controller.getAvailability(req, res, next)
);

module.exports = router;
