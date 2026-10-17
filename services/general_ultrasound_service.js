const sequelize = require('../libs/sequelize');
const OwnershipService = require('./ownership_service');

const { models } = sequelize;
const ownership = new OwnershipService();

class GeneralUltrasoundService {
  async findByRecord(clinicalRecordId, userId) {
    await ownership.record(clinicalRecordId, userId);
    return models.GeneralUltrasound.findAll({
      where: { clinicalRecordId },
      order: [['createdAt', 'ASC']],
    });
  }

  /** Un registro por (consulta, subtipo): crea o reemplaza los hallazgos. */
  async save(clinicalRecordId, subType, findings, userId) {
    await ownership.record(clinicalRecordId, userId);
    const existing = await models.GeneralUltrasound.findOne({ where: { clinicalRecordId, subType } });
    if (existing) {
      await existing.update({ findings });
      return existing;
    }
    return models.GeneralUltrasound.create({ clinicalRecordId, subType, findings });
  }

  async remove(id, userId) {
    const record = await ownership.generalUltrasound(id, userId);
    await record.destroy();
    return { id, deleted: true };
  }
}

module.exports = GeneralUltrasoundService;
