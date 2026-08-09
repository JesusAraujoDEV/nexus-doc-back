const { Model, DataTypes, Sequelize } = require('sequelize');
const { PATIENT_TABLE } = require('./patient_model');
const { DOCTOR_TABLE } = require('./doctor_model');

const PREGNANCY_TABLE = 'pregnancies';

const PregnancySchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  patientId: {
    allowNull: false,
    field: 'patient_id',
    type: DataTypes.UUID,
    references: { model: PATIENT_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  doctorId: {
    allowNull: false,
    field: 'doctor_id',
    type: DataTypes.UUID,
    references: { model: DOCTOR_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  pregnancyNumber: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'pregnancy_number',
  },
  lmpDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'lmp_date',
  },
  lmpSource: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'lmp_source',
    defaultValue: 'reported',
  },
  lmpReferenceDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'lmp_reference_date',
  },
  lmpReferenceWeeks: {
    allowNull: true,
    type: DataTypes.SMALLINT,
    field: 'lmp_reference_weeks',
  },
  lmpReferenceDays: {
    allowNull: true,
    type: DataTypes.SMALLINT,
    field: 'lmp_reference_days',
  },
  fetalSex: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'fetal_sex',
  },
  isFinalized: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_finalized',
    defaultValue: false,
  },
  isLoss: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_loss',
    defaultValue: false,
  },
  isEctopic: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_ectopic',
    defaultValue: false,
  },
  newbornData: {
    allowNull: true,
    type: DataTypes.JSONB,
    field: 'newborn_data',
  },
  notes: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  legacyCode: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'legacy_code',
    unique: true,
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

class Pregnancy extends Model {
  static associate(models) {
    this.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    this.belongsTo(models.Doctor, { as: 'doctor', foreignKey: 'doctor_id' });
    this.hasMany(models.ClinicalRecord, { as: 'clinicalRecords', foreignKey: 'pregnancy_id' });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PREGNANCY_TABLE,
      modelName: 'Pregnancy',
      timestamps: true,
      paranoid: true,
      underscored: true,
    };
  }
}

module.exports = { PREGNANCY_TABLE, PregnancySchema, Pregnancy };
