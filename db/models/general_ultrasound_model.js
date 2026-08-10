const { Model, DataTypes, Sequelize } = require('sequelize');
const { CLINICAL_RECORD_TABLE } = require('./clinical_record_model');

const GENERAL_ULTRASOUND_TABLE = 'general_ultrasounds';

const GeneralUltrasoundSchema = {
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
  subType: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'sub_type',
  },
  findings: {
    allowNull: true,
    type: DataTypes.JSONB,
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

class GeneralUltrasound extends Model {
  static associate(models) {
    this.belongsTo(models.ClinicalRecord, { as: 'clinicalRecord', foreignKey: 'clinical_record_id' });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: GENERAL_ULTRASOUND_TABLE,
      modelName: 'GeneralUltrasound',
      timestamps: true,
      paranoid: true,
      underscored: true,
    };
  }
}

module.exports = { GENERAL_ULTRASOUND_TABLE, GeneralUltrasoundSchema, GeneralUltrasound };
