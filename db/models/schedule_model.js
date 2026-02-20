const { Model, DataTypes, Sequelize } = require('sequelize');
const { DOCTOR_TABLE } = require('./doctor_model');

const SCHEDULE_TABLE = 'schedules';

const ScheduleSchema = {
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
  dayOfWeek: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'day_of_week',
    validate: {
      min: 0,
      max: 6,
    },
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
  isWorkingDay: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_working_day',
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

class Schedule extends Model {
  static associate(models) {
    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SCHEDULE_TABLE,
      modelName: 'Schedule',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { SCHEDULE_TABLE, ScheduleSchema, Schedule };
