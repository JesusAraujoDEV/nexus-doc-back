const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const { models } = sequelize;
const doctorService = new DoctorService();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function buildSearchWhere(doctorId, search) {
  if (!search) return { doctorId };
  const like = { [Op.iLike]: `%${search}%` };
  return {
    doctorId,
    [Op.or]: [
      { firstName: like },
      { lastName: like },
      { cedula: like },
      { phone: like },
    ],
  };
}

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

  async findByDoctor(userId, { search, page, limit } = {}) {
    const doctor = await doctorService.findByUserId(userId);

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));

    const { rows, count } = await models.Patient.findAndCountAll({
      where: buildSearchWhere(doctor.id, search),
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")'
            ),
            'visitsCount',
          ],
          [
            sequelize.literal(
              '(SELECT MAX(created_at) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")'
            ),
            'lastVisit',
          ],
        ],
      },
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    return {
      items: rows,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / limitNum),
    };
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
