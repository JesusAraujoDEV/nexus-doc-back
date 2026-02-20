const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

class DoctorService {
  async findBySlug(slug) {
    const doctor = await models.Doctor.findOne({
      where: { slug },
      include: [
        {
          model: models.Service,
          as: 'services',
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!doctor) {
      throw boom.notFound('Doctor not found');
    }

    return doctor;
  }

  async findByUserId(userId) {
    const doctor = await models.Doctor.findOne({ where: { userId } });
    if (!doctor) {
      throw boom.notFound('Doctor profile not found');
    }
    return doctor;
  }
}

module.exports = DoctorService;
