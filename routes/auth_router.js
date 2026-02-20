const express = require('express');
const passport = require('passport');

const validatorHandler = require('../middlewares/validator_handler');
const { loginAuthSchema, registerAuthSchema } = require('../schemas/auth_schema');
const AuthController = require('../controllers/auth_controller');

const router = express.Router();
const controller = new AuthController();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     role:
 *                       type: string
 *                     email:
 *                       type: string
 */
router.post(
  '/login',
  passport.authenticate('local', { session: false }),
  validatorHandler(loginAuthSchema, 'body'),
  (req, res, next) => controller.login(req, res, next)
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registro interno de usuarios DOCTOR/ADMIN
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [DOCTOR, ADMIN]
 *     responses:
 *       201:
 *         description: Usuario creado
 */
router.post(
  '/register',
  validatorHandler(registerAuthSchema, 'body'),
  (req, res, next) => controller.register(req, res, next)
);

module.exports = router;
