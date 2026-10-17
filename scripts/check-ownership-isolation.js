/**
 * Prueba de aislamiento entre doctores (IDOR) contra la base real, SIN escribir.
 *
 * Simula un doctor B inexistente parcheando DoctorService.findByUserId, toma
 * recursos reales del doctor A y verifica que cada operación del service
 * responda 404 al doctor B. Cualquier escritura (create/update/destroy/restore)
 * está bloqueada: si un service se saltara el filtro, falla en vez de tocar
 * datos de producción.
 *
 * Al final corre lo mismo como doctor A para confirmar que sigue viendo lo suyo.
 *
 * Uso: node -r dotenv/config scripts/check-ownership-isolation.js
 */
const crypto = require('crypto');
const { Model } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('../services/doctor_service');

const FAKE_USER = 'user-doctor-b';
const FAKE_DOCTOR = crypto.randomUUID();

const realFindByUserId = DoctorService.prototype.findByUserId;
DoctorService.prototype.findByUserId = async function patched(userId) {
  if (userId === FAKE_USER) return { id: FAKE_DOCTOR };
  return realFindByUserId.call(this, userId);
};

function blockWrites() {
  const blocked = () => { throw new Error('ESCRITURA BLOQUEADA: el filtro por doctor no se aplicó'); };
  ['update', 'destroy', 'restore', 'save'].forEach((m) => { Model.prototype[m] = blocked; });
  ['create', 'bulkCreate', 'update', 'destroy'].forEach((m) => { Model[m] = blocked; });
}

const PatientService = require('../services/patient_service');
const ClinicalRecordService = require('../services/clinical_record_service');
const ClinicalRecordPdfService = require('../services/clinical_record_pdf_service');
const PregnancyService = require('../services/pregnancy_service');
const LabExamOrderService = require('../services/lab_exam_order_service');
const MedicalReportService = require('../services/medical_report_service');
const GeneralUltrasoundService = require('../services/general_ultrasound_service');
const AppointmentService = require('../services/appointment_service');

async function sample(models) {
  const first = (model, where = {}) => model.findOne({ where, paranoid: false });
  return {
    patient: await first(models.Patient),
    record: await first(models.ClinicalRecord),
    pregnancy: await first(models.Pregnancy),
    labOrder: await first(models.LabExamOrder),
    report: await first(models.MedicalReport),
    gu: await first(models.GeneralUltrasound),
    appointment: await first(models.Appointment),
  };
}

function buildCases(s) {
  const p = new PatientService();
  const cr = new ClinicalRecordService();
  const pdf = new ClinicalRecordPdfService();
  const pr = new PregnancyService();
  const lo = new LabExamOrderService();
  const mr = new MedicalReportService();
  const gu = new GeneralUltrasoundService();
  const ap = new AppointmentService();
  const cases = [
    [s.patient, 'patient.findOne', (u) => p.findOne(s.patient.id, u)],
    [s.patient, 'patient.update', (u) => p.update(s.patient.id, { address: 'x' }, u)],
    [s.patient, 'patient.softDelete', (u) => p.softDelete(s.patient.id, u)],
    [s.patient, 'patient.restore', (u) => p.restore(s.patient.id, u)],
    [s.patient, 'record.findByPatient', (u) => cr.findByPatient(s.patient.id, u)],
    [s.patient, 'record.create (paciente ajena)', (u) => cr.createByUser({ patientId: s.patient.id }, u)],
    [s.record, 'record.findOne', (u) => cr.findOne(s.record.id, u)],
    [s.record, 'record.update', (u) => cr.update(s.record.id, { diagnosis: 'x' }, u)],
    [s.record, 'record.softDelete', (u) => cr.softDelete(s.record.id, u)],
    [s.record, 'record.restore', (u) => cr.restore(s.record.id, u)],
    [s.record, 'pdf.prescription', (u) => pdf.prescription(s.record.id, u)],
    [s.record, 'pdf.labExam', (u) => pdf.labExam(s.record.id, u)],
    [s.record, 'report.findByRecord', (u) => mr.findByRecord(s.record.id, u)],
    [s.record, 'report.create (consulta ajena)', (u) => mr.createByUser({ clinicalRecordId: s.record.id }, u)],
    [s.record, 'labOrder.findByRecord', (u) => lo.findByRecord(s.record.id, u)],
    [s.record, 'gu.findByRecord', (u) => gu.findByRecord(s.record.id, u)],
    [s.record, 'gu.save (consulta ajena)', (u) => gu.save(s.record.id, 'abdominal', {}, u)],
    [s.patient, 'pregnancy.findByPatient', (u) => pr.findByPatient(s.patient.id, u)],
    [s.patient, 'pregnancy.create (paciente ajena)', (u) => pr.createByUser({ patientId: s.patient.id }, u)],
    [s.patient, 'labOrder.findByPatient', (u) => lo.findByPatient(s.patient.id, u)],
    [s.patient, 'labOrder.order (paciente ajena)', (u) => lo.orderByUser({ patientId: s.patient.id }, u)],
    [s.pregnancy, 'pregnancy.findOne', (u) => pr.findOne(s.pregnancy.id, u)],
    [s.pregnancy, 'pregnancy.update', (u) => pr.update(s.pregnancy.id, { notes: 'x' }, u)],
    [s.pregnancy, 'pregnancy.pdf', (u) => pr.pdf(s.pregnancy.id, u)],
    [s.labOrder, 'labOrder.recordResult', (u) => lo.recordResult(s.labOrder.id, {}, u)],
    [s.labOrder, 'labOrder.remove', (u) => lo.remove(s.labOrder.id, u)],
    [s.report, 'report.findOne', (u) => mr.findOne(s.report.id, u)],
    [s.report, 'report.update', (u) => mr.update(s.report.id, { title: 'x' }, u)],
    [s.report, 'report.pdf', (u) => mr.pdf(s.report.id, u)],
    [s.gu, 'gu.remove', (u) => gu.remove(s.gu.id, u)],
    [s.appointment, 'appointment.updateStatus', (u) => ap.updateStatus(s.appointment.id, { status: 'X' }, u)],
  ];
  return cases.filter(([resource]) => resource);
}

async function runAsDoctorB(cases) {
  let failures = 0;
  for (const [, name, call] of cases) {
    try {
      await call(FAKE_USER);
      failures += 1;
      console.log(`  ✗ ${name}: el doctor B obtuvo el recurso`);
    } catch (err) {
      const ok = err.isBoom && err.output.statusCode === 404;
      if (!ok) failures += 1;
      console.log(`  ${ok ? '✓' : '✗'} ${name}: ${err.isBoom ? err.output.statusCode : err.message}`);
    }
  }
  return failures;
}

async function runAsDoctorA(s, userIdA) {
  const reads = [
    ['patient.findOne', () => new PatientService().findOne(s.patient.id, userIdA)],
    ['record.findByPatient', () => new ClinicalRecordService().findByPatient(s.patient.id, userIdA)],
    ['record.findOne', () => new ClinicalRecordService().findOne(s.record.id, userIdA)],
  ];
  let failures = 0;
  for (const [name, call] of reads) {
    try {
      await call();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures += 1;
      console.log(`  ✗ ${name}: ${err.message}`);
    }
  }
  return failures;
}

async function main() {
  const { models } = sequelize;
  const s = await sample(models);
  if (s.record && s.record.deletedAt) s.record = await models.ClinicalRecord.findOne();
  const doctorA = await models.Doctor.findOne({ where: { id: s.patient.doctorId } });
  blockWrites();

  const cases = buildCases(s);
  console.log(`Doctor B (falso) contra ${cases.length} operaciones del doctor A:`);
  const failB = await runAsDoctorB(cases);
  console.log('\nDoctor A sigue viendo lo suyo:');
  const failA = await runAsDoctorA(s, doctorA.userId);

  await sequelize.close();
  const ok = failB === 0 && failA === 0;
  console.log(ok ? '\n✓ aislamiento OK' : `\n✗ fallas: B=${failB} A=${failA}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
