const AuthService = require('./../services/auth_service');
const UserService = require('./../services/user_service');

const service = new AuthService();
const userService = new UserService();

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

  async changePassword(req, res, next) {
    try {
      const userId = req.user.sub;
      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(userId, currentPassword, newPassword);
      res.json({ message: 'Password updated' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
