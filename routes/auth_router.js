const express = require('express');
const passport = require('passport');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { loginLimiter } = require('../middlewares/rate_limit_handler');
const { loginAuthSchema, registerAuthSchema, changePasswordSchema } = require('../schemas/auth_schema');
const AuthController = require('../controllers/auth_controller');

const router = express.Router();
const controller = new AuthController();

router.post(
  '/login',
  loginLimiter,
  passport.authenticate('local', { session: false }),
  validatorHandler(loginAuthSchema, 'body'),
  (req, res, next) => controller.login(req, res, next)
);

// Antes era público y el rol lo elegía quien se registraba (incluido ADMIN):
// cualquiera podía crearse una cuenta DOCTOR y leer historias clínicas.
// Ahora solo un ADMIN autenticado puede crear usuarios.
router.post(
  '/register',
  authenticateJwt,
  checkRoles('ADMIN'),
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
