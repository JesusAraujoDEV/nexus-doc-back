const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const { models } = sequelize;
const doctorService = new DoctorService();

class PatientService {
  async createQuick(data, userId) {
    const doctor = await doctorService.findByUserId(userId);

    const newPatient = await models.Patient.create({
      doctorId: doctor.id,
      firstName: data.firstName,
      lastName: data.lastName,
      cedula: data.cedula,
      phone: data.phone,
      birthDate: data.birthDate || '1900-01-01',
    });

    return newPatient;
  }

  async findByDoctor(userId) {
    const doctor = await doctorService.findByUserId(userId);

    const patients = await models.Patient.findAll({
      where: { doctorId: doctor.id },
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM appointments WHERE appointments.patient_id = "Patient"."id")'
            ),
            'appointmentsCount',
          ],
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    return patients;
  }

  async findOne(id) {
    const patient = await models.Patient.findByPk(id, {
      include: [
        { model: models.Appointment, as: 'appointments' },
        { model: models.ClinicalRecord, as: 'clinicalRecords' },
        { model: models.PatientFile, as: 'files' },
      ],
    });

    if (!patient) {
      throw boom.notFound('Patient not found');
    }

    return patient;
  }
}

module.exports = PatientService;
