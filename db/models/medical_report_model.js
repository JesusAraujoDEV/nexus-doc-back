const { Model, DataTypes, Sequelize } = require('sequelize');
const { CLINICAL_RECORD_TABLE } = require('./clinical_record_model');
const { PATIENT_TABLE } = require('./patient_model');
const { DOCTOR_TABLE } = require('./doctor_model');
const { REFERRING_DOCTOR_TABLE } = require('./referring_doctor_model');
const { MEDICAL_CENTER_TABLE } = require('./medical_center_model');

const MEDICAL_REPORT_TABLE = 'medical_reports';

const MedicalReportSchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  clinicalRecordId: {
    allowNull: false,
    field: 'clinical_record_id',
    type: DataTypes.UUID,
    references: { model: CLINICAL_RECORD_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  patientId: {
    allowNull: false,
    field: 'patient_id',
    type: DataTypes.UUID,
    references: { model: PATIENT_TABLE, key: 'id' },
  },
  doctorId: {
    allowNull: false,
    field: 'doctor_id',
    type: DataTypes.UUID,
    references: { model: DOCTOR_TABLE, key: 'id' },
  },
  type: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  title: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  referringDoctorId: {
    allowNull: true,
    field: 'referring_doctor_id',
    type: DataTypes.UUID,
    references: { model: REFERRING_DOCTOR_TABLE, key: 'id' },
  },
  medicalCenterId: {
    allowNull: true,
    field: 'medical_center_id',
    type: DataTypes.UUID,
    references: { model: MEDICAL_CENTER_TABLE, key: 'id' },
  },
  content: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  constanciaText: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'constancia_text',
  },
  realizandoseText: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'realizandose_text',
  },
  indicatesRest: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'indicates_rest',
    defaultValue: false,
  },
  deletedAt: {
    allowNull: true,
    type: DataTypes.DATE,
    field: 'deleted_at',
  },
  createdAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: Sequelize.NOW,
  },
  updatedAt: {
    allowNull: false,
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: Sequelize.NOW,
  },
};

class MedicalReport extends Model {
  static associate(models) {
    this.belongsTo(models.ClinicalRecord, { as: 'clinicalRecord', foreignKey: 'clinical_record_id' });
    this.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    this.belongsTo(models.Doctor, { as: 'doctor', foreignKey: 'doctor_id' });
    this.belongsTo(models.ReferringDoctor, { as: 'referringDoctor', foreignKey: 'referring_doctor_id' });
    this.belongsTo(models.MedicalCenter, { as: 'medicalCenter', foreignKey: 'medical_center_id' });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: MEDICAL_REPORT_TABLE,
      modelName: 'MedicalReport',
      timestamps: true,
      paranoid: true,
      underscored: true,
    };
  }
}

module.exports = { MEDICAL_REPORT_TABLE, MedicalReportSchema, MedicalReport };
