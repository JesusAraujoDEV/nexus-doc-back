const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');
const { buildPrescriptionPdf } = require('../libs/pdf/prescription-pdf');
const { buildUltrasoundPdf } = require('../libs/pdf/ultrasound-pdf');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();

class ClinicalRecordService {
  async create(data, doctorId) {
    const newRecord = await models.ClinicalRecord.create({
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
    });

    return newRecord;
  }

  async createByUser(data, userId) {
    const doctor = await doctorService.findByUserId(userId);
    return this.create(data, doctor.id);
  }

  async findByPatient(patientId) {
    const records = await models.ClinicalRecord.findAll({
      where: { patientId },
      include: [
        { model: models.Doctor, as: 'doctor' },
        { model: models.Appointment, as: 'appointment' },
        { model: models.PatientFile, as: 'files' },
      ],
      // por fecha real de consulta, cayendo a createdAt cuando no hay
      order: [
        [sequelize.literal('COALESCE("ClinicalRecord"."visit_date", "ClinicalRecord"."created_at"::date)'), 'DESC'],
      ],
    });
    return records;
  }

  async findOne(id) {
    const record = await models.ClinicalRecord.findByPk(id);
    if (!record) throw boom.notFound('Clinical record not found');
    return record;
  }

  async update(id, changes) {
    const record = await models.ClinicalRecord.findByPk(id);
    if (!record) throw boom.notFound('Clinical record not found');
    await record.update(changes);
    return record;
  }

  async softDelete(id) {
    const record = await models.ClinicalRecord.findByPk(id);
    if (!record) throw boom.notFound('Clinical record not found');
    await record.destroy(); // paranoid: pone deleted_at
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.ClinicalRecord, userId, [{ model: models.Patient, as: 'patient' }]);
  }

  async restore(id) {
    return trashService.restore(models.ClinicalRecord, id);
  }

  async findWithPatientAndDoctor(id) {
    const record = await models.ClinicalRecord.findByPk(id, {
      include: [
        { model: models.Patient, as: 'patient' },
        { model: models.Doctor, as: 'doctor' },
      ],
    });
    if (!record) throw boom.notFound('Clinical record not found');
    return record;
  }

  async prescriptionPdf(id) {
    const record = await this.findWithPatientAndDoctor(id);
    return buildPrescriptionPdf({ doctor: record.doctor, patient: record.patient, record });
  }

  async ultrasoundPdf(id) {
    const record = await this.findWithPatientAndDoctor(id);
    return buildUltrasoundPdf({ doctor: record.doctor, patient: record.patient, record });
  }
}

module.exports = ClinicalRecordService;
