const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');
const TrashService = require('./trash_service');
const OwnershipService = require('./ownership_service');

const { models } = sequelize;
const trashService = new TrashService();
const ownership = new OwnershipService();

const INCLUDE_EXAM = { model: models.LabExam, as: 'exam' };

/** Una consulta usada para ordenar o registrar un resultado debe ser del doctor y de la misma paciente. */
async function assertRecordOfPatient(recordId, patientId, userId) {
  if (!recordId) return;
  const record = await ownership.record(recordId, userId);
  if (record.patientId !== patientId) throw boom.badRequest('La consulta no pertenece a esta paciente');
}

class LabExamOrderService {
  async orderByUser(data, userId) {
    const patient = await ownership.patient(data.patientId, userId);
    await assertRecordOfPatient(data.orderedRecordId, patient.id, userId);
    return models.LabExamOrder.create({
      examId: data.examId,
      patientId: patient.id,
      doctorId: patient.doctorId,
      orderedRecordId: data.orderedRecordId,
      orderedDate: data.orderedDate || null,
    });
  }

  /** Ordenes de este paciente con resultado pendiente (para la pestaña "Registro de resultados"). */
  async findPendingForPatient(patientId, userId) {
    const patient = await ownership.patient(patientId, userId);
    return models.LabExamOrder.findAll({
      where: { patientId: patient.id, doctorId: patient.doctorId, resultRecordId: null },
      include: [INCLUDE_EXAM],
      order: [['orderedDate', 'DESC']],
    });
  }

  /** Historial completo (pendientes + con resultado) de este paciente, para la pestaña "Lab. exámenes" del perfil. */
  async findByPatient(patientId, userId) {
    const patient = await ownership.patient(patientId, userId);
    return models.LabExamOrder.findAll({
      where: { patientId: patient.id, doctorId: patient.doctorId },
      include: [INCLUDE_EXAM],
      order: [['orderedDate', 'DESC']],
    });
  }

  async findByRecord(recordId, userId) {
    const record = await ownership.record(recordId, userId);
    return models.LabExamOrder.findAll({
      where: {
        doctorId: record.doctorId,
        [Op.or]: [{ orderedRecordId: recordId }, { resultRecordId: recordId }],
      },
      include: [INCLUDE_EXAM],
      order: [['createdAt', 'ASC']],
    });
  }

  async recordResult(id, data, userId) {
    const order = await ownership.labOrder(id, userId);
    await assertRecordOfPatient(data.resultRecordId, order.patientId, userId);
    await order.update({
      resultRecordId: data.resultRecordId,
      performedDate: data.performedDate || null,
      resultValue: data.resultValue || null,
      resultObservations: data.resultObservations || null,
    });
    return order;
  }

  async remove(id, userId) {
    const order = await ownership.labOrder(id, userId);
    await order.destroy();
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.LabExamOrder, userId);
  }

  async restore(id, userId) {
    return trashService.restore(models.LabExamOrder, id, userId);
  }
}

module.exports = LabExamOrderService;
