const express = require('express');

const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const StatsController = require('../controllers/stats_controller');

const router = express.Router();
const controller = new StatsController();

router.get(
  '/summary',
  authenticateJwt,
  checkRoles('DOCTOR'),
  (req, res, next) => controller.summary(req, res, next)
);

router.get(
  '/visit-types',
  authenticateJwt,
  checkRoles('DOCTOR'),
  (req, res, next) => controller.visitTypes(req, res, next)
);

module.exports = router;
