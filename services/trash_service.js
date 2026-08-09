const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const DoctorService = require('./doctor_service');

const doctorService = new DoctorService();

/** Papelera genérica: cualquier modelo paranoid con doctor_id puede listar/restaurar sus borrados por acá. */
class TrashService {
  async listDeleted(model, userId, include) {
    const doctor = await doctorService.findByUserId(userId);
    return model.findAll({
      where: { doctorId: doctor.id, deletedAt: { [Op.not]: null } },
      paranoid: false,
      order: [['deletedAt', 'DESC']],
      include,
    });
  }

  async restore(model, id) {
    const record = await model.findByPk(id, { paranoid: false });
    if (!record) throw boom.notFound('No encontrado');
    if (!record.deletedAt) throw boom.badRequest('No está en la papelera');
    await record.restore();
    return record;
  }
}

module.exports = TrashService;
