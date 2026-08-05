const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const { models } = sequelize;
const doctorService = new DoctorService();

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
}

module.exports = ClinicalRecordService;
