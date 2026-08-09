const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');
const { VISITS_COUNT_SQL, LAST_VISIT_SQL, buildOrder, buildSearchWhere } = require('./patient-search');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
      address: data.address || null,
      // Práctica 100% ginecológica: no tiene sentido preguntar el sexo al crear.
      gender: 'Femenino',
      referredByType: data.referredByType || null,
      referredByDetail: data.referredByDetail || null,
      medicalBackground: data.medicalBackground || {},
    });

    return newPatient;
  }

  async findByDoctor(userId, { search, page, limit, sortBy, sortDir, gender, hasVisits, hasCedula, pregnant } = {}) {
    const doctor = await doctorService.findByUserId(userId);

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));

    const { rows, count } = await models.Patient.findAndCountAll({
      where: buildSearchWhere(doctor.id, { search, gender, hasVisits, hasCedula, pregnant }),
      attributes: {
        include: [
          [sequelize.literal(VISITS_COUNT_SQL), 'visitsCount'],
          // visit_date es la fecha real de la consulta; created_at es cuándo
          // se creó la fila, que para la historia importada es el día de la
          // migración. Se cae a created_at solo si no hay visit_date.
          [sequelize.literal(LAST_VISIT_SQL), 'lastVisit'],
        ],
      },
      order: buildOrder(sortBy, sortDir),
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      subQuery: false,
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
        { model: models.Pregnancy, as: 'pregnancies' },
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

  async update(id, changes) {
    const patient = await models.Patient.findByPk(id);
    if (!patient) throw boom.notFound('Patient not found');
    await patient.update(changes);
    return patient;
  }

  async softDelete(id) {
    const patient = await models.Patient.findByPk(id);
    if (!patient) throw boom.notFound('Patient not found');
    await patient.destroy(); // paranoid: pone deleted_at
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.Patient, userId);
  }

  async restore(id) {
    return trashService.restore(models.Patient, id);
  }
}

module.exports = PatientService;
