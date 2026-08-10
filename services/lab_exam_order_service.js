const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();

const INCLUDE_EXAM = { model: models.LabExam, as: 'exam' };

class LabExamOrderService {
  async orderByUser(data, userId) {
    const doctor = await doctorService.findByUserId(userId);
    return models.LabExamOrder.create({
      examId: data.examId,
      patientId: data.patientId,
      doctorId: doctor.id,
      orderedRecordId: data.orderedRecordId,
      orderedDate: data.orderedDate || null,
    });
  }

  /** Ordenes de este paciente con resultado pendiente (para la pestaña "Registro de resultados"). */
  async findPendingForPatient(patientId) {
    return models.LabExamOrder.findAll({
      where: { patientId, resultRecordId: null },
      include: [INCLUDE_EXAM],
      order: [['orderedDate', 'DESC']],
    });
  }

  async findByRecord(recordId) {
    return models.LabExamOrder.findAll({
      where: { [Op.or]: [{ orderedRecordId: recordId }, { resultRecordId: recordId }] },
      include: [INCLUDE_EXAM],
      order: [['createdAt', 'ASC']],
    });
  }

  async recordResult(id, data) {
    const order = await models.LabExamOrder.findByPk(id);
    if (!order) throw boom.notFound('Orden de examen no encontrada');
    await order.update({
      resultRecordId: data.resultRecordId,
      performedDate: data.performedDate || null,
      resultValue: data.resultValue || null,
      resultObservations: data.resultObservations || null,
    });
    return order;
  }

  async remove(id) {
    const order = await models.LabExamOrder.findByPk(id);
    if (!order) throw boom.notFound('Orden de examen no encontrada');
    await order.destroy();
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.LabExamOrder, userId);
  }

  async restore(id) {
    return trashService.restore(models.LabExamOrder, id);
  }
}

module.exports = LabExamOrderService;
