const { Model, DataTypes, Sequelize } = require('sequelize');
const { DOCTOR_TABLE } = require('./doctor_model');

const SCHEDULE_EXCEPTION_TABLE = 'schedule_exceptions';

const ScheduleExceptionSchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
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
  exceptionDate: {
    allowNull: false,
    type: DataTypes.DATEONLY,
    field: 'exception_date',
  },
  isDayOff: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_day_off',
  },
  startTime: {
    allowNull: true,
    type: DataTypes.TIME,
    field: 'start_time',
  },
  endTime: {
    allowNull: true,
    type: DataTypes.TIME,
    field: 'end_time',
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

class ScheduleException extends Model {
  static associate(models) {
    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SCHEDULE_EXCEPTION_TABLE,
      modelName: 'ScheduleException',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { SCHEDULE_EXCEPTION_TABLE, ScheduleExceptionSchema, ScheduleException };
