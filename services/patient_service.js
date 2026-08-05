const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');

const { models } = sequelize;
const doctorService = new DoctorService();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const VISITS_COUNT_SQL = '(SELECT COUNT(*) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")';
const LAST_VISIT_SQL = '(SELECT MAX(COALESCE(visit_date, created_at::date)) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")';

const SORT_COLUMNS = {
  name: ['firstName', 'lastName'],
  cedula: ['cedula'],
  createdAt: ['createdAt'],
  visitsCount: [sequelize.literal(VISITS_COUNT_SQL)],
  lastVisit: [sequelize.literal(LAST_VISIT_SQL)],
};

// "Vacío" para cada columna ordenable: sin cédula, cero consultas, sin
// visita registrada. Estos registros van siempre al final, sea ASC o DESC
// — si no, alternar la dirección los pone de primero justo cuando el
// usuario quiere ver los que sí tienen dato, que es la mitad del tiempo.
const EMPTY_LAST_SQL = {
  cedula: '"Patient"."cedula" IS NULL',
  visitsCount: `${VISITS_COUNT_SQL} = 0`,
  lastVisit: `${LAST_VISIT_SQL} IS NULL`,
};

function buildOrder(sortBy, sortDir) {
  const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';
  const columns = SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt;
  const order = [];
  if (EMPTY_LAST_SQL[sortBy]) {
    order.push([sequelize.literal(EMPTY_LAST_SQL[sortBy]), 'ASC']);
  }
  for (const col of columns) {
    order.push([col, dir]);
  }
  return order;
}

function buildSearchWhere(doctorId, { search, gender, hasVisits, hasCedula }) {
  const where = { doctorId };
  const and = [];

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    const fullName = sequelize.where(
      sequelize.fn('concat', sequelize.col('first_name'), ' ', sequelize.col('last_name')),
      { [Op.iLike]: `%${search}%` },
    );
    where[Op.or] = [
      { firstName: like },
      { lastName: like },
      { cedula: like },
      { phone: like },
      fullName,
    ];
  }

  if (gender) {
    where.gender = gender;
  }

  if (hasVisits === 'true') {
    and.push(sequelize.literal(`${VISITS_COUNT_SQL} > 0`));
  } else if (hasVisits === 'false') {
    and.push(sequelize.literal(`${VISITS_COUNT_SQL} = 0`));
  }

  if (hasCedula === 'true') {
    where.cedula = { [Op.not]: null };
  } else if (hasCedula === 'false') {
    where.cedula = null;
  }

  if (and.length) {
    where[Op.and] = and;
  }

  return where;
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

  async findByDoctor(userId, { search, page, limit, sortBy, sortDir, gender, hasVisits, hasCedula } = {}) {
    const doctor = await doctorService.findByUserId(userId);

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));

    const { rows, count } = await models.Patient.findAndCountAll({
      where: buildSearchWhere(doctor.id, { search, gender, hasVisits, hasCedula }),
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
}

module.exports = PatientService;
