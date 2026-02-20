const { Model, DataTypes, Sequelize } = require('sequelize');
const { PATIENT_TABLE } = require('./patient_model');
const { DOCTOR_TABLE } = require('./doctor_model');
const { SERVICE_TABLE } = require('./service_model');

const APPOINTMENT_TABLE = 'appointments';

const AppointmentSchema = {
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
  serviceId: {
    allowNull: false,
    field: 'service_id',
    type: DataTypes.UUID,
    references: {
      model: SERVICE_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  appointmentDate: {
    allowNull: false,
    type: DataTypes.DATEONLY,
    field: 'appointment_date',
  },
  startTime: {
    allowNull: false,
    type: DataTypes.TIME,
    field: 'start_time',
  },
  endTime: {
    allowNull: false,
    type: DataTypes.TIME,
    field: 'end_time',
  },
  isPaid: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_paid',
    defaultValue: false,
  },
  paymentMethod: {
    allowNull: true,
    type: DataTypes.ENUM('ZELLE', 'PAGO_MOVIL', 'EFECTIVO', 'SEGURO'),
    field: 'payment_method',
  },
  status: {
    allowNull: false,
    type: DataTypes.ENUM('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'),
    defaultValue: 'PENDIENTE',
  },
  patientNotes: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'patient_notes',
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

class Appointment extends Model {
  static associate(models) {
    this.belongsTo(models.Patient, {
      as: 'patient',
      foreignKey: 'patient_id',
    });

    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });

    this.belongsTo(models.Service, {
      as: 'service',
      foreignKey: 'service_id',
    });

    this.hasMany(models.ClinicalRecord, {
      as: 'clinicalRecords',
      foreignKey: 'appointment_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: APPOINTMENT_TABLE,
      modelName: 'Appointment',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { APPOINTMENT_TABLE, AppointmentSchema, Appointment };
