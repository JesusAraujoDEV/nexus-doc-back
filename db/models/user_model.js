const { Model, DataTypes, Sequelize } = require('sequelize');

const USER_TABLE = 'users';

const UserSchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  email: {
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  passwordHash: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'password_hash',
  },
  role: {
    allowNull: false,
    type: DataTypes.ENUM('DOCTOR', 'PACIENTE', 'ADMIN'),
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

class User extends Model {
  static associate(models) {
    // Relación 1:1 con Doctor
    this.hasOne(models.Doctor, {
      as: 'doctorProfile',
      foreignKey: 'user_id',
    });

    // Relación 1:1 (opcional) con Patient
    this.hasOne(models.Patient, {
      as: 'patientProfile',
      foreignKey: 'user_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: USER_TABLE,
      modelName: 'User',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { USER_TABLE, UserSchema, User };
