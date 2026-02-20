const { Model, DataTypes, Sequelize } = require('sequelize');
const { PATIENT_TABLE } = require('./patient_model');
const { CLINICAL_RECORD_TABLE } = require('./clinical_record_model');

const PATIENT_FILE_TABLE = 'patient_files';

const PatientFileSchema = {
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
  clinicalRecordId: {
    allowNull: true,
    field: 'clinical_record_id',
    type: DataTypes.UUID,
    references: {
      model: CLINICAL_RECORD_TABLE,
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  fileUrl: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'file_url',
  },
  fileName: {
    allowNull: false,
    type: DataTypes.STRING,
    field: 'file_name',
  },
  fileType: {
    allowNull: false,
    type: DataTypes.ENUM('PDF', 'IMAGE', 'OTHER'),
    field: 'file_type',
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

class PatientFile extends Model {
  static associate(models) {
    this.belongsTo(models.Patient, {
      as: 'patient',
      foreignKey: 'patient_id',
    });

    this.belongsTo(models.ClinicalRecord, {
      as: 'clinicalRecord',
      foreignKey: 'clinical_record_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PATIENT_FILE_TABLE,
      modelName: 'PatientFile',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { PATIENT_FILE_TABLE, PatientFileSchema, PatientFile };
