const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

class GeneralUltrasoundService {
  async findByRecord(clinicalRecordId) {
    return models.GeneralUltrasound.findAll({
      where: { clinicalRecordId },
      order: [['createdAt', 'ASC']],
    });
  }

  /** Un registro por (consulta, subtipo): crea o reemplaza los hallazgos. */
  async save(clinicalRecordId, subType, findings) {
    const existing = await models.GeneralUltrasound.findOne({ where: { clinicalRecordId, subType } });
    if (existing) {
      await existing.update({ findings });
      return existing;
    }
    return models.GeneralUltrasound.create({ clinicalRecordId, subType, findings });
  }

  async remove(id) {
    const record = await models.GeneralUltrasound.findByPk(id);
    if (!record) throw boom.notFound('Ecografía no encontrada');
    await record.destroy();
    return { id, deleted: true };
  }
}

module.exports = GeneralUltrasoundService;
