const sequelize = require('../libs/sequelize');
const OwnershipService = require('./ownership_service');
const { buildMedicalReportPdf } = require('../libs/pdf/medical-report-pdf');

const { models } = sequelize;
const ownership = new OwnershipService();

const INCLUDES = [
  { model: models.ReferringDoctor, as: 'referringDoctor' },
  { model: models.MedicalCenter, as: 'medicalCenter' },
];

// Un informe cuelga de su consulta: no se re-asigna a otra consulta, paciente o doctor.
const IMMUTABLE_FIELDS = ['id', 'doctorId', 'patientId', 'clinicalRecordId', 'createdAt', 'updatedAt', 'deletedAt'];

class MedicalReportService {
  async createByUser(data, userId) {
    // La paciente se deriva de la consulta; no se confía en el patientId del body.
    const record = await ownership.record(data.clinicalRecordId, userId);
    return models.MedicalReport.create({
      clinicalRecordId: record.id,
      patientId: record.patientId,
      doctorId: record.doctorId,
      type: data.type,
      title: data.title || null,
      referringDoctorId: data.referringDoctorId || null,
      medicalCenterId: data.medicalCenterId || null,
      content: data.content || null,
      constanciaText: data.constanciaText || null,
      realizandoseText: data.realizandoseText || null,
      indicatesRest: data.indicatesRest || false,
    });
  }

  async findByRecord(clinicalRecordId, userId) {
    const record = await ownership.record(clinicalRecordId, userId);
    return models.MedicalReport.findAll({
      where: { clinicalRecordId: record.id, doctorId: record.doctorId },
      include: INCLUDES,
      order: [['createdAt', 'ASC']],
    });
  }

  async findOne(id, userId) {
    return ownership.report(id, userId, {
      include: [...INCLUDES, { model: models.Patient, as: 'patient' }, { model: models.Doctor, as: 'doctor' }],
    });
  }

  async update(id, changes, userId) {
    const report = await ownership.report(id, userId);
    const clean = { ...changes };
    IMMUTABLE_FIELDS.forEach((field) => delete clean[field]);
    await report.update(clean);
    return report;
  }

  async remove(id, userId) {
    const report = await ownership.report(id, userId);
    await report.destroy();
    return { id, deleted: true };
  }

  async pdf(id, userId) {
    const report = await this.findOne(id, userId);
    return buildMedicalReportPdf({ doctor: report.doctor, patient: report.patient, report });
  }
}

module.exports = MedicalReportService;
