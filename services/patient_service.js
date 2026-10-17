const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');
const OwnershipService = require('./ownership_service');
const { VISITS_COUNT_SQL, LAST_VISIT_SQL, buildOrder, buildSearchWhere } = require('./patient-search');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();
const ownership = new OwnershipService();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Campos que el cliente puede cambiar por PATCH. doctorId nunca: mover una
// paciente a otro doctor no es una edición.
const IMMUTABLE_FIELDS = ['id', 'doctorId', 'createdAt', 'updatedAt', 'deletedAt'];

const DETAIL_INCLUDE = [
  { model: models.Appointment, as: 'appointments' },
  { model: models.ClinicalRecord, as: 'clinicalRecords' },
  { model: models.PatientFile, as: 'files' },
  { model: models.Pregnancy, as: 'pregnancies' },
  { model: models.ReferringDoctor, as: 'referredByDoctor' },
];

// El literal va calificado y sin el modelo en la tupla: si se pasa el modelo,
// Sequelize prefija el literal con el alias y genera
// `"clinicalRecords".COALESCE(...)`, que no es SQL válido. Y las columnas deben
// calificarse porque los JOIN dejan created_at ambiguo.
const DETAIL_ORDER = [
  [sequelize.literal('COALESCE("clinicalRecords"."visit_date", "clinicalRecords"."created_at"::date)'), 'DESC'],
];

function withoutImmutable(changes) {
  const clean = { ...changes };
  IMMUTABLE_FIELDS.forEach((field) => delete clean[field]);
  return clean;
}

class PatientService {
  async createQuick(data, userId) {
    const doctor = await doctorService.findByUserId(userId);

    return models.Patient.create({
      doctorId: doctor.id,
      firstName: data.firstName,
      lastName: data.lastName,
      cedula: data.cedula || null,
      phone: data.phone || null,
      birthDate: data.birthDate || '1900-01-01',
      address: data.address || null,
      // Práctica 100% ginecológica: no tiene sentido preguntar el sexo al crear.
      gender: 'Femenino',
      referredByType: data.referredByType || null,
      referredByDetail: data.referredByDetail || null,
      referredByDoctorId: data.referredByDoctorId || null,
      medicalBackground: data.medicalBackground || {},
      weightKg: data.weightKg || null,
      heightCm: data.heightCm || null,
    });
  }

  async findByDoctor(userId, { search, page, limit, sortBy, sortDir, gender, hasVisits, hasCedula, pregnant, labsPending } = {}) {
    const doctor = await doctorService.findByUserId(userId);

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));

    const { rows, count } = await models.Patient.findAndCountAll({
      where: buildSearchWhere(doctor.id, { search, gender, hasVisits, hasCedula, pregnant, labsPending }),
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

    return { items: rows, total: count, page: pageNum, pages: Math.ceil(count / limitNum) };
  }

  async findOne(id, userId) {
    const doctorId = await ownership.doctorIdFor(userId);
    const patient = await models.Patient.findOne({
      where: { id, doctorId },
      include: DETAIL_INCLUDE,
      order: DETAIL_ORDER,
    });
    if (!patient) throw ownership.notFound('Paciente');
    return patient;
  }

  async update(id, changes, userId) {
    const patient = await ownership.patient(id, userId);
    await patient.update(withoutImmutable(changes));
    return patient;
  }

  async softDelete(id, userId) {
    const patient = await ownership.patient(id, userId);
    await patient.destroy(); // paranoid: pone deleted_at
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.Patient, userId);
  }

  async restore(id, userId) {
    return trashService.restore(models.Patient, id, userId);
  }
}

module.exports = PatientService;
