const boom = require('@hapi/boom');
const bcrypt = require('bcrypt');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

class UserService {
  async create(data) {
    const hash = await bcrypt.hash(data.password, 10);
    const newUser = await models.User.create({
      email: data.email,
      passwordHash: hash,
      role: data.role,
    });

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
  }

  async findOneByEmail(email) {
    const user = await models.User.findOne({ where: { email } });
    return user;
  }

  async findOne(id) {
    const user = await models.User.findByPk(id);
    if (!user) {
      throw boom.notFound('User not found');
    }
    return user;
  }

  async changePassword(id, currentPassword, newPassword) {
    const user = await this.findOne(id);

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      // badRequest, not unauthorized: this is a wrong-input business error on an
      // already-authenticated request, not a session/token failure. The frontend's
      // global 401 handler logs the user out, which would be the wrong UX here.
      throw boom.badRequest('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash });
  }
}

module.exports = UserService;
