const { Model, DataTypes, Sequelize } = require('sequelize');
const { USER_TABLE } = require('./user_model');

const DOCTOR_TABLE = 'doctors';

const DoctorSchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    allowNull: false,
    field: 'user_id',
    type: DataTypes.UUID,
    unique: true,
    references: {
      model: USER_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  slug: {
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
  specialty: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  clinicName: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'clinic_name',
  },
  phone: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  experienceYears: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'experience_years',
    validate: {
      min: 0,
    },
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

class Doctor extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'user_id',
    });

    this.hasMany(models.Patient, {
      as: 'patients',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.Service, {
      as: 'services',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.Schedule, {
      as: 'schedules',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.ScheduleException, {
      as: 'scheduleExceptions',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.Appointment, {
      as: 'appointments',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.ClinicalRecord, {
      as: 'clinicalRecords',
      foreignKey: 'doctor_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: DOCTOR_TABLE,
      modelName: 'Doctor',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { DOCTOR_TABLE, DoctorSchema, Doctor };
