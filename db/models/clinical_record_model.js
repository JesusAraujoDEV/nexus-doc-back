const { Model, DataTypes, Sequelize } = require('sequelize');
const { PATIENT_TABLE } = require('./patient_model');
const { DOCTOR_TABLE } = require('./doctor_model');
const { APPOINTMENT_TABLE } = require('./appointment_model');

const CLINICAL_RECORD_TABLE = 'clinical_records';

const ClinicalRecordSchema = {
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
    references: {
      model: PATIENT_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  appointmentId: {
    allowNull: true,
    field: 'appointment_id',
    type: DataTypes.UUID,
    references: {
      model: APPOINTMENT_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  doctorId: {
    allowNull: false,
    field: 'doctor_id',
    type: DataTypes.UUID,
    references: {
      model: DOCTOR_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  symptoms: {
    allowNull: false,
    type: DataTypes.TEXT,
  },
  diagnosis: {
    allowNull: false,
    type: DataTypes.TEXT,
  },
  treatment: {
    allowNull: false,
    type: DataTypes.TEXT,
  },
  privateNotes: {
    allowNull: false,
    type: DataTypes.TEXT,
    field: 'private_notes',
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

class ClinicalRecord extends Model {
  static associate(models) {
    this.belongsTo(models.Patient, {
      as: 'patient',
      foreignKey: 'patient_id',
    });

    this.belongsTo(models.Appointment, {
      as: 'appointment',
      foreignKey: 'appointment_id',
    });

    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.PatientFile, {
      as: 'files',
      foreignKey: 'clinical_record_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: CLINICAL_RECORD_TABLE,
      modelName: 'ClinicalRecord',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { CLINICAL_RECORD_TABLE, ClinicalRecordSchema, ClinicalRecord };
