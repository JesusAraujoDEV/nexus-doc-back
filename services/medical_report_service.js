const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const { buildMedicalReportPdf } = require('../libs/pdf/medical-report-pdf');

const { models } = sequelize;
const doctorService = new DoctorService();

const INCLUDES = [
  { model: models.ReferringDoctor, as: 'referringDoctor' },
  { model: models.MedicalCenter, as: 'medicalCenter' },
];

class MedicalReportService {
  async createByUser(data, userId) {
    const doctor = await doctorService.findByUserId(userId);
    return models.MedicalReport.create({
      clinicalRecordId: data.clinicalRecordId,
      patientId: data.patientId,
      doctorId: doctor.id,
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

  async findByRecord(clinicalRecordId) {
    return models.MedicalReport.findAll({
      where: { clinicalRecordId },
      include: INCLUDES,
      order: [['createdAt', 'ASC']],
    });
  }

  async findOne(id) {
    const report = await models.MedicalReport.findByPk(id, {
      include: [...INCLUDES, { model: models.Patient, as: 'patient' }, { model: models.Doctor, as: 'doctor' }],
    });
    if (!report) throw boom.notFound('Informe no encontrado');
    return report;
  }

  async update(id, changes) {
    const report = await models.MedicalReport.findByPk(id);
    if (!report) throw boom.notFound('Informe no encontrado');
    await report.update(changes);
    return report;
  }

  async remove(id) {
    const report = await models.MedicalReport.findByPk(id);
    if (!report) throw boom.notFound('Informe no encontrado');
    await report.destroy();
    return { id, deleted: true };
  }

  async pdf(id) {
    const report = await this.findOne(id);
    return buildMedicalReportPdf({ doctor: report.doctor, patient: report.patient, report });
  }
}

module.exports = MedicalReportService;
