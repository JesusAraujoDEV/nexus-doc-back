const { Model, DataTypes, Sequelize } = require('sequelize');
const { USER_TABLE } = require('./user_model');
const { DOCTOR_TABLE } = require('./doctor_model');

const PATIENT_TABLE = 'patients';

const PatientSchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    allowNull: true,
    field: 'user_id',
    type: DataTypes.UUID,
    references: {
      model: USER_TABLE,
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
  cedula: {
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
  },
  firstName: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'first_name',
  },
  lastName: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'last_name',
  },
  phone: {
    allowNull: true,
    type: DataTypes.STRING,
  },
  birthDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'birth_date',
  },
  historyNumber: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'history_number',
  },
  gender: {
    allowNull: true,
    type: DataTypes.STRING,
  },
  bloodType: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'blood_type',
  },
  address: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  medicalBackground: {
    allowNull: true,
    type: DataTypes.JSONB,
    field: 'medical_background',
    defaultValue: {},
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

class Patient extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'user_id',
    });

    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.Appointment, {
      as: 'appointments',
      foreignKey: 'patient_id',
    });

    this.hasMany(models.ClinicalRecord, {
      as: 'clinicalRecords',
      foreignKey: 'patient_id',
    });

    this.hasMany(models.PatientFile, {
      as: 'files',
      foreignKey: 'patient_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PATIENT_TABLE,
      modelName: 'Patient',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { PATIENT_TABLE, PatientSchema, Patient };
