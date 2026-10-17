const sequelize = require('../libs/sequelize');
const OwnershipService = require('./ownership_service');
const GeneralUltrasoundService = require('./general_ultrasound_service');
const LabExamOrderService = require('./lab_exam_order_service');
const { buildPrescriptionPdf } = require('../libs/pdf/prescription-pdf');
const { buildUltrasoundPdf } = require('../libs/pdf/ultrasound-pdf');
const { buildGeneralUltrasoundPdf } = require('../libs/pdf/general-ultrasound-pdf');
const { buildLabExamPdf } = require('../libs/pdf/lab-exam-pdf');

const { models } = sequelize;
const ownership = new OwnershipService();
const generalUltrasoundService = new GeneralUltrasoundService();
const labExamOrderService = new LabExamOrderService();

const PATIENT_AND_DOCTOR = [
  { model: models.Patient, as: 'patient' },
  { model: models.Doctor, as: 'doctor' },
];

/** PDFs imprimibles de una consulta. Todos exigen que la consulta sea del doctor autenticado. */
class ClinicalRecordPdfService {
  async recordWithParties(id, userId) {
    return ownership.record(id, userId, { include: PATIENT_AND_DOCTOR });
  }

  async prescription(id, userId) {
    const record = await this.recordWithParties(id, userId);
    return buildPrescriptionPdf({ doctor: record.doctor, patient: record.patient, record });
  }

  async ultrasound(id, userId) {
    const record = await this.recordWithParties(id, userId);
    return buildUltrasoundPdf({ doctor: record.doctor, patient: record.patient, record });
  }

  async generalUltrasound(id, userId) {
    const record = await this.recordWithParties(id, userId);
    const generalUltrasounds = await generalUltrasoundService.findByRecord(id, userId);
    return buildGeneralUltrasoundPdf({ doctor: record.doctor, patient: record.patient, record, generalUltrasounds });
  }

  async labExam(id, userId) {
    const record = await this.recordWithParties(id, userId);
    const orders = await labExamOrderService.findByRecord(id, userId);
    return buildLabExamPdf({ doctor: record.doctor, patient: record.patient, record, orders });
  }
}

module.exports = ClinicalRecordPdfService;
