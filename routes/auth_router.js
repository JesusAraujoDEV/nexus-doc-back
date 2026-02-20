const express = require('express');
const passport = require('passport');

const validatorHandler = require('../middlewares/validator_handler');
const { loginAuthSchema, registerAuthSchema } = require('../schemas/auth_schema');
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

module.exports = router;
