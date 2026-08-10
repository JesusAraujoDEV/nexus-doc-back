const { Model, DataTypes, Sequelize } = require('sequelize');
const { PATIENT_TABLE } = require('./patient_model');
const { DOCTOR_TABLE } = require('./doctor_model');
const { LAB_EXAM_TABLE } = require('./lab_exam_model');
const { CLINICAL_RECORD_TABLE } = require('./clinical_record_model');

const LAB_EXAM_ORDER_TABLE = 'lab_exam_orders';

const LabExamOrderSchema = {
  id: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  },
  examId: {
    allowNull: false,
    field: 'exam_id',
    type: DataTypes.UUID,
    references: { model: LAB_EXAM_TABLE, key: 'id' },
  },
  patientId: {
    allowNull: false,
    field: 'patient_id',
    type: DataTypes.UUID,
    references: { model: PATIENT_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  doctorId: {
    allowNull: false,
    field: 'doctor_id',
    type: DataTypes.UUID,
    references: { model: DOCTOR_TABLE, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  orderedRecordId: {
    allowNull: true,
    field: 'ordered_record_id',
    type: DataTypes.UUID,
    references: { model: CLINICAL_RECORD_TABLE, key: 'id' },
  },
  resultRecordId: {
    allowNull: true,
    field: 'result_record_id',
    type: DataTypes.UUID,
    references: { model: CLINICAL_RECORD_TABLE, key: 'id' },
  },
  orderedDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'ordered_date',
  },
  performedDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'performed_date',
  },
  resultValue: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'result_value',
  },
  resultObservations: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'result_observations',
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

class LabExamOrder extends Model {
  static associate(models) {
    this.belongsTo(models.LabExam, { as: 'exam', foreignKey: 'exam_id' });
    this.belongsTo(models.Patient, { as: 'patient', foreignKey: 'patient_id' });
    this.belongsTo(models.Doctor, { as: 'doctor', foreignKey: 'doctor_id' });
    this.belongsTo(models.ClinicalRecord, { as: 'orderedRecord', foreignKey: 'ordered_record_id' });
    this.belongsTo(models.ClinicalRecord, { as: 'resultRecord', foreignKey: 'result_record_id' });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: LAB_EXAM_ORDER_TABLE,
      modelName: 'LabExamOrder',
      timestamps: true,
      paranoid: true,
      underscored: true,
    };
  }
}

module.exports = { LAB_EXAM_ORDER_TABLE, LabExamOrderSchema, LabExamOrder };
