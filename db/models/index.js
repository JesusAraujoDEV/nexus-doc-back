const { User, UserSchema } = require('./user_model');
const { Doctor, DoctorSchema } = require('./doctor_model');
const { Patient, PatientSchema } = require('./patient_model');
const { Service, ServiceSchema } = require('./service_model');
const { Schedule, ScheduleSchema } = require('./schedule_model');
const { ScheduleException, ScheduleExceptionSchema } = require('./schedule_exception_model');
const { Appointment, AppointmentSchema } = require('./appointment_model');
const { ClinicalRecord, ClinicalRecordSchema } = require('./clinical_record_model');
const { PatientFile, PatientFileSchema } = require('./patient_file_model');

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
