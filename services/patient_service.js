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
  const fullName = sequelize.where(
    sequelize.fn('concat', sequelize.col('first_name'), ' ', sequelize.col('last_name')),
    { [Op.iLike]: `%${search}%` },
  );
  return {
    doctorId,
    [Op.or]: [
      { firstName: like },
      { lastName: like },
      { cedula: like },
      { phone: like },
      fullName,
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
            // visit_date es la fecha real de la consulta; created_at es cuándo
            // se creó la fila, que para la historia importada es el día de la
            // migración. Se cae a created_at solo si no hay visit_date.
            sequelize.literal(
              '(SELECT MAX(COALESCE(visit_date, created_at::date)) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")'
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
      // El literal va calificado y sin el modelo en la tupla: si se pasa el
      // modelo, Sequelize prefija el literal con el alias y genera
      // `"clinicalRecords".COALESCE(...)`, que no es SQL válido. Y las columnas
      // deben calificarse porque los JOIN dejan created_at ambiguo.
      order: [
        [
          sequelize.literal('COALESCE("clinicalRecords"."visit_date", "clinicalRecords"."created_at"::date)'),
          'DESC',
        ],
      ],
    });

    if (!patient) {
      throw boom.notFound('Patient not found');
    }

    return patient;
  }
}

module.exports = PatientService;
