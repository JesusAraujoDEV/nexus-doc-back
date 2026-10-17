const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const { models } = sequelize;
const doctorService = new DoctorService();

/**
 * Autorización por recurso: cada búsqueda por id se filtra por el doctor del
 * usuario autenticado. Si el recurso no existe o es de otro doctor se responde
 * 404 (no 403) para no confirmar que existe.
 *
 * Antes los services buscaban con findByPk(id) a secas: cualquier usuario con
 * rol DOCTOR podía leer, editar o borrar historias ajenas conociendo el UUID.
 */
class OwnershipService {
  async doctorIdFor(userId) {
    const doctor = await doctorService.findByUserId(userId);
    return doctor.id;
  }

  notFound(label) {
    return boom.notFound(`${label || 'Registro'} no encontrado`);
  }

  async owned(model, id, userId, { label, paranoid = true, include } = {}) {
    const doctorId = await this.doctorIdFor(userId);
    const row = await model.findOne({ where: { id, doctorId }, paranoid, include });
    if (!row) throw this.notFound(label);
    return row;
  }

  patient(id, userId, opts = {}) {
    return this.owned(models.Patient, id, userId, { label: 'Paciente', ...opts });
  }

  record(id, userId, opts = {}) {
    return this.owned(models.ClinicalRecord, id, userId, { label: 'Consulta', ...opts });
  }

  pregnancy(id, userId, opts = {}) {
    return this.owned(models.Pregnancy, id, userId, { label: 'Embarazo', ...opts });
  }

  labOrder(id, userId, opts = {}) {
    return this.owned(models.LabExamOrder, id, userId, { label: 'Orden de examen', ...opts });
  }

  report(id, userId, opts = {}) {
    return this.owned(models.MedicalReport, id, userId, { label: 'Informe', ...opts });
  }

  appointment(id, userId, opts = {}) {
    return this.owned(models.Appointment, id, userId, { label: 'Cita', ...opts });
  }

  /** general_ultrasounds no tiene doctor_id: la propiedad se hereda de su consulta. */
  async generalUltrasound(id, userId) {
    const doctorId = await this.doctorIdFor(userId);
    const row = await models.GeneralUltrasound.findOne({
      where: { id },
      include: [{ model: models.ClinicalRecord, as: 'clinicalRecord', where: { doctorId }, attributes: ['id'] }],
    });
    if (!row) throw boom.notFound('Ecografía no encontrada');
    return row;
  }

  /** Un embarazo enlazado a una consulta debe ser de la misma paciente. */
  async assertPregnancyOfPatient(pregnancyId, patientId, userId) {
    if (!pregnancyId) return;
    const pregnancy = await this.pregnancy(pregnancyId, userId);
    if (pregnancy.patientId !== patientId) throw boom.badRequest('El embarazo no pertenece a esta paciente');
  }
}

module.exports = OwnershipService;
