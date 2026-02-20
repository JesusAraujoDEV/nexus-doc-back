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
}

module.exports = UserService;
