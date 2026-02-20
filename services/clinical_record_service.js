const sequelize = require('../libs/sequelize');

const { models } = sequelize;

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
    });

    return newRecord;
  }

  async findByPatient(patientId) {
    const records = await models.ClinicalRecord.findAll({
      where: { patientId },
      include: [
        { model: models.Doctor, as: 'doctor' },
        { model: models.Appointment, as: 'appointment' },
        { model: models.PatientFile, as: 'files' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return records;
  }
}

module.exports = ClinicalRecordService;
