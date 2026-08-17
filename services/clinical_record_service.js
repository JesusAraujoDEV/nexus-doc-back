const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');
const GeneralUltrasoundService = require('./general_ultrasound_service');
const LabExamOrderService = require('./lab_exam_order_service');
const { buildPrescriptionPdf } = require('../libs/pdf/prescription-pdf');
const { buildUltrasoundPdf } = require('../libs/pdf/ultrasound-pdf');
const { buildGeneralUltrasoundPdf } = require('../libs/pdf/general-ultrasound-pdf');
const { buildLabExamPdf } = require('../libs/pdf/lab-exam-pdf');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();
const generalUltrasoundService = new GeneralUltrasoundService();
const labExamOrderService = new LabExamOrderService();

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
      labOrders: data.labOrders,
      visitType: data.visitType,
      visitDate: data.visitDate || new Date(),
      recipeItems: data.recipeItems || null,
      ultrasoundFindings: data.ultrasoundFindings || null,
      nextAppointmentDate: data.nextAppointmentDate || null,
      category: data.category || 'gynecology',
      pregnancyId: data.pregnancyId || null,
      indicatesPrescription: data.indicatesPrescription || false,
      indicatesImagingStudy: data.indicatesImagingStudy || false,
    });

    return newRecord;
  }

  async createByUser(data, userId) {
    const doctor = await doctorService.findByUserId(userId);
    return this.create(data, doctor.id);
  }

  async findByPatient(patientId) {
    const records = await models.ClinicalRecord.findAll({
      where: { patientId },
      include: [
        { model: models.Doctor, as: 'doctor' },
        { model: models.Appointment, as: 'appointment' },
        { model: models.PatientFile, as: 'files' },
      ],
      // por fecha real de consulta, cayendo a createdAt cuando no hay
      order: [
        [sequelize.literal('COALESCE("ClinicalRecord"."visit_date", "ClinicalRecord"."created_at"::date)'), 'DESC'],
      ],
    });
    return records;
  }

  // Consultas del doctor en [from, to] para la vista de calendario. Misma fecha
  // "real" que patient-search.js usa para última visita: visit_date si existe,
  // si no el día en que se creó el registro (historia importada sin visit_date).
  async findCalendarRange(doctorId, from, to) {
    const dateExpr = sequelize.literal('COALESCE("ClinicalRecord"."visit_date", "ClinicalRecord"."created_at"::date)');
    const records = await models.ClinicalRecord.findAll({
      where: {
        doctorId,
        [Op.and]: [sequelize.where(dateExpr, { [Op.between]: [from, to] })],
      },
      include: [{ model: models.Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName'] }],
      order: [[dateExpr, 'ASC']],
    });

    return records.map((record) => ({
      id: record.id,
      patientId: record.patientId,
      patientName: `${record.patient.firstName} ${record.patient.lastName}`,
      date: record.visitDate || record.createdAt.toISOString().slice(0, 10),
      category: record.category,
    }));
  }

  async findCalendarRangeByUser(userId, from, to) {
    const doctor = await doctorService.findByUserId(userId);
    return this.findCalendarRange(doctor.id, from, to);
  }

  async findOne(id) {
    const record = await models.ClinicalRecord.findByPk(id);
    if (!record) throw boom.notFound('Clinical record not found');
    return record;
  }

  async update(id, changes) {
    const record = await models.ClinicalRecord.findByPk(id);
    if (!record) throw boom.notFound('Clinical record not found');
    await record.update(changes);
    return record;
  }

  async softDelete(id) {
    const record = await models.ClinicalRecord.findByPk(id);
    if (!record) throw boom.notFound('Clinical record not found');
    await record.destroy(); // paranoid: pone deleted_at
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.ClinicalRecord, userId, [{ model: models.Patient, as: 'patient' }]);
  }

  async restore(id) {
    return trashService.restore(models.ClinicalRecord, id);
  }

  async findWithPatientAndDoctor(id) {
    const record = await models.ClinicalRecord.findByPk(id, {
      include: [
        { model: models.Patient, as: 'patient' },
        { model: models.Doctor, as: 'doctor' },
      ],
    });
    if (!record) throw boom.notFound('Clinical record not found');
    return record;
  }

  async prescriptionPdf(id) {
    const record = await this.findWithPatientAndDoctor(id);
    return buildPrescriptionPdf({ doctor: record.doctor, patient: record.patient, record });
  }

  async ultrasoundPdf(id) {
    const record = await this.findWithPatientAndDoctor(id);
    return buildUltrasoundPdf({ doctor: record.doctor, patient: record.patient, record });
  }

  async generalUltrasoundPdf(id) {
    const record = await this.findWithPatientAndDoctor(id);
    const generalUltrasounds = await generalUltrasoundService.findByRecord(id);
    return buildGeneralUltrasoundPdf({ doctor: record.doctor, patient: record.patient, record, generalUltrasounds });
  }

  async labExamPdf(id) {
    const record = await this.findWithPatientAndDoctor(id);
    const orders = await labExamOrderService.findByRecord(id);
    return buildLabExamPdf({ doctor: record.doctor, patient: record.patient, record, orders });
  }
}

module.exports = ClinicalRecordService;
