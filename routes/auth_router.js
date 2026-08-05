const express = require('express');
const passport = require('passport');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt } = require('../middlewares/auth_handler');
const { loginAuthSchema, registerAuthSchema, changePasswordSchema } = require('../schemas/auth_schema');
const AuthController = require('../controllers/auth_controller');

const router = express.Router();
const controller = new AuthController();

router.post(
  '/login',
  passport.authenticate('local', { session: false }),
  validatorHandler(loginAuthSchema, 'body'),
  (req, res, next) => controller.login(req, res, next)
);

router.post(
  '/register',
  validatorHandler(registerAuthSchema, 'body'),
  (req, res, next) => controller.register(req, res, next)
);

router.post(
  '/change-password',
  authenticateJwt,
  validatorHandler(changePasswordSchema, 'body'),
  (req, res, next) => controller.changePassword(req, res, next)
);

module.exports = router;
