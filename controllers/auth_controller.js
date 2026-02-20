const AuthService = require('./../services/auth_service');

const service = new AuthService();

class AuthController {
  async login(req, res, next) {
    try {
      const user = req.user;
      res.json(service.signToken(user));
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const body = req.body;
      const newUser = await service.register(body);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
