const boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { config } = require('../config/config');
const UserService = require('./user_service');

const userService = new UserService();

class AuthService {
  async getUser(email, password) {
    const user = await userService.findOneByEmail(email);
    if (!user) {
      throw boom.unauthorized('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw boom.unauthorized('Invalid credentials');
    }

    return user;
  }

  signToken(user) {
    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
      },
    };
  }

  async register(data) {
    const newUser = await userService.create(data);
    return newUser;
  }
}

module.exports = AuthService;
