const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');
const OwnershipService = require('./ownership_service');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();
const ownership = new OwnershipService();

// Mover una consulta a otra paciente u otro doctor no es una edición.
const IMMUTABLE_FIELDS = ['id', 'doctorId', 'patientId', 'createdAt', 'updatedAt', 'deletedAt'];

const REAL_DATE_SQL = 'COALESCE("ClinicalRecord"."visit_date", "ClinicalRecord"."created_at"::date)';

function withoutImmutable(changes) {
  const clean = { ...changes };
  IMMUTABLE_FIELDS.forEach((field) => delete clean[field]);
  return clean;
}

class ClinicalRecordService {
  async create(data, doctorId) {
    return models.ClinicalRecord.create({
      patientId: data.patientId,
      appointmentId: data.appointmentId || null,
      doctorId,
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      privateNotes: data.privateNotes,
      labOrders: data.labOrders,
      visitType: data.visitType,
      visitDate: data.visitDate || new Date(),
      recipeItems: data.recipeItems || null,
      ultrasoundFindings: data.ultrasoundFindings || null,
      nextAppointmentDate: data.nextAppointmentDate || null,
      category: data.category || 'gynecology',
      pregnancyId: data.pregnancyId || null,
      indicatesPrescription: data.indicatesPrescription || false,
      indicatesImagingStudy: data.indicatesImagingStudy || false,
      evolution: data.evolution || null,
      recommendations: data.recommendations || null,
      medicalCertificate: data.medicalCertificate || null,
      diagnosticImpressions: data.diagnosticImpressions || null,
    });
  }

  async createByUser(data, userId) {
    const patient = await ownership.patient(data.patientId, userId);
    await ownership.assertPregnancyOfPatient(data.pregnancyId, patient.id, userId);
    return this.create(data, patient.doctorId);
  }

  async findByPatient(patientId, userId) {
    const patient = await ownership.patient(patientId, userId);
    return models.ClinicalRecord.findAll({
      where: { patientId: patient.id, doctorId: patient.doctorId },
      include: [
        { model: models.Doctor, as: 'doctor' },
        { model: models.Appointment, as: 'appointment' },
        { model: models.PatientFile, as: 'files' },
      ],
      // por fecha real de consulta, cayendo a createdAt cuando no hay
      order: [[sequelize.literal(REAL_DATE_SQL), 'DESC']],
    });
  }

  // Consultas del doctor en [from, to] para la vista de calendario. Misma fecha
  // "real" que patient-search.js usa para última visita: visit_date si existe,
  // si no el día en que se creó el registro (historia importada sin visit_date).
  async findCalendarRange(doctorId, from, to) {
    const dateExpr = sequelize.literal(REAL_DATE_SQL);
    const records = await models.ClinicalRecord.findAll({
      where: {
        doctorId,
        [Op.and]: [sequelize.where(dateExpr, { [Op.between]: [from, to] })],
      },
      include: [{ model: models.Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName'] }],
      order: [[dateExpr, 'ASC']],
    });

    return records.map((record) => ({
      id: record.id,
      patientId: record.patientId,
      patientName: `${record.patient.firstName} ${record.patient.lastName}`,
      date: record.visitDate || record.createdAt.toISOString().slice(0, 10),
      category: record.category,
    }));
  }

  async findCalendarRangeByUser(userId, from, to) {
    const doctor = await doctorService.findByUserId(userId);
    return this.findCalendarRange(doctor.id, from, to);
  }

  async findOne(id, userId) {
    return ownership.record(id, userId);
  }

  async update(id, changes, userId) {
    const record = await ownership.record(id, userId);
    const clean = withoutImmutable(changes);
    if (clean.pregnancyId) await ownership.assertPregnancyOfPatient(clean.pregnancyId, record.patientId, userId);
    await record.update(clean);
    return record;
  }

  async softDelete(id, userId) {
    const record = await ownership.record(id, userId);
    await record.destroy(); // paranoid: pone deleted_at
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.ClinicalRecord, userId, [{ model: models.Patient, as: 'patient' }]);
  }

  async restore(id, userId) {
    return trashService.restore(models.ClinicalRecord, id, userId);
  }
}

module.exports = ClinicalRecordService;
