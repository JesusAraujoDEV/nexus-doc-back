const { User, UserSchema } = require('./user_model');
const { Doctor, DoctorSchema } = require('./doctor_model');
const { Patient, PatientSchema } = require('./patient_model');
const { Service, ServiceSchema } = require('./service_model');
const { Schedule, ScheduleSchema } = require('./schedule_model');
const { ScheduleException, ScheduleExceptionSchema } = require('./schedule_exception_model');
const { Appointment, AppointmentSchema } = require('./appointment_model');
const { ClinicalRecord, ClinicalRecordSchema } = require('./clinical_record_model');
const { PatientFile, PatientFileSchema } = require('./patient_file_model');
const { MedicalCenter, MedicalCenterSchema } = require('./medical_center_model');
const { DiagnosisCatalog, DiagnosisCatalogSchema } = require('./diagnosis_catalog_model');
const { Lab, LabSchema } = require('./lab_model');
const { Medication, MedicationSchema } = require('./medication_model');
const { LabExam, LabExamSchema } = require('./lab_exam_model');
const { Icd10Code, Icd10CodeSchema } = require('./icd10_code_model');

function setupModels(sequelize) {
  User.init(UserSchema, User.config(sequelize));
  Doctor.init(DoctorSchema, Doctor.config(sequelize));
  Patient.init(PatientSchema, Patient.config(sequelize));
  Service.init(ServiceSchema, Service.config(sequelize));
  Schedule.init(ScheduleSchema, Schedule.config(sequelize));
  ScheduleException.init(ScheduleExceptionSchema, ScheduleException.config(sequelize));
  Appointment.init(AppointmentSchema, Appointment.config(sequelize));
  ClinicalRecord.init(ClinicalRecordSchema, ClinicalRecord.config(sequelize));
  PatientFile.init(PatientFileSchema, PatientFile.config(sequelize));
  MedicalCenter.init(MedicalCenterSchema, MedicalCenter.config(sequelize));
  DiagnosisCatalog.init(DiagnosisCatalogSchema, DiagnosisCatalog.config(sequelize));
  Lab.init(LabSchema, Lab.config(sequelize));
  Medication.init(MedicationSchema, Medication.config(sequelize));
  LabExam.init(LabExamSchema, LabExam.config(sequelize));
  Icd10Code.init(Icd10CodeSchema, Icd10Code.config(sequelize));

  User.associate(sequelize.models);
  Doctor.associate(sequelize.models);
  Patient.associate(sequelize.models);
  Service.associate(sequelize.models);
  Schedule.associate(sequelize.models);
  ScheduleException.associate(sequelize.models);
  Appointment.associate(sequelize.models);
  ClinicalRecord.associate(sequelize.models);
  PatientFile.associate(sequelize.models);
}

module.exports = { setupModels };
