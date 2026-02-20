const { Model, DataTypes, Sequelize } = require('sequelize');
const { DOCTOR_TABLE } = require('./doctor_model');

const SERVICE_TABLE = 'services';

const ServiceSchema = {
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
  name: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  description: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  durationMinutes: {
    allowNull: false,
    type: DataTypes.INTEGER,
    field: 'duration_minutes',
    validate: {
      min: 1,
    },
  },
  price: {
    allowNull: true,
    type: DataTypes.DECIMAL(10, 2),
  },
  isActive: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true,
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

class Service extends Model {
  static associate(models) {
    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.Appointment, {
      as: 'appointments',
      foreignKey: 'service_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SERVICE_TABLE,
      modelName: 'Service',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { SERVICE_TABLE, ServiceSchema, Service };
