const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

const validatorHandler = require('../middlewares/validator_handler');
const { requireSyncToken } = require('../middlewares/sync_token_handler');
const LegacySyncController = require('../controllers/legacy_sync_controller');

const router = express.Router();
const controller = new LegacySyncController();

// La laptop manda el paquete comprimido (Content-Encoding: gzip). El límite
// se aplica al JSON ya descomprimido (~15 MB hoy).
const bigJson = express.json({ limit: '80mb' });
const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false });
const idSchema = Joi.object({ id: Joi.string().guid({ version: 'uuidv4' }).required() });

router.post('/', uploadLimiter, requireSyncToken, bigJson, (req, res, next) => controller.start(req, res, next));

router.get(
  '/:id',
  requireSyncToken,
  validatorHandler(idSchema, 'params'),
  (req, res, next) => controller.status(req, res, next)
);

module.exports = router;
