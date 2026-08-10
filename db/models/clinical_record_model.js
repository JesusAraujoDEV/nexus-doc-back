const { Model, DataTypes, Sequelize } = require('sequelize');
const { PATIENT_TABLE } = require('./patient_model');
const { DOCTOR_TABLE } = require('./doctor_model');
const { APPOINTMENT_TABLE } = require('./appointment_model');

const CLINICAL_RECORD_TABLE = 'clinical_records';

const ClinicalRecordSchema = {
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
  appointmentId: {
    allowNull: true,
    field: 'appointment_id',
    type: DataTypes.UUID,
    references: {
      model: APPOINTMENT_TABLE,
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
  symptoms: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  diagnosis: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  treatment: {
    allowNull: true,
    type: DataTypes.TEXT,
  },
  privateNotes: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'private_notes',
  },
  labOrders: {
    allowNull: true,
    type: DataTypes.TEXT,
    field: 'lab_orders',
  },
  visitType: {
    allowNull: true,
    type: DataTypes.STRING,
    field: 'visit_type',
  },
  // Fecha real de la consulta. Distinta de createdAt, que es cuándo se creó
  // la fila: para la historia importada, createdAt es el día de la migración.
  visitDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'visit_date',
  },
  legacyRecordId: {
    allowNull: true,
    type: DataTypes.INTEGER,
    field: 'legacy_record_id',
  },
  nextAppointmentDate: {
    allowNull: true,
    type: DataTypes.DATEONLY,
    field: 'next_appointment_date',
  },
  indicatesPrescription: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'indicates_prescription',
    defaultValue: false,
  },
  indicatesImagingStudy: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    field: 'indicates_imaging_study',
    defaultValue: false,
  },
  // Récipe como items {nombre, comercial, posologia} en vez del string plano de `treatment`.
  recipeItems: {
    allowNull: true,
    type: DataTypes.JSONB,
    field: 'recipe_items',
  },
  // Hallazgos de ecografía (útero, ovarios, biometría fetal) decodificados desde
  // los campos de CONSULTA.DAT — ver data/scripts/analisis/19_extraer_ecografia_recipe.js.
  ultrasoundFindings: {
    allowNull: true,
    type: DataTypes.JSONB,
    field: 'ultrasound_findings',
  },
  // 'gynecology' | 'obstetrics'. Determina qué formulario de ultrasonido usa el
  // frontend; 'obstetrics' implica que la consulta cuelga de una Ficha de Embarazo.
  category: {
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'gynecology',
  },
  pregnancyId: {
    allowNull: true,
    field: 'pregnancy_id',
    type: DataTypes.UUID,
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
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

class ClinicalRecord extends Model {
  static associate(models) {
    this.belongsTo(models.Patient, {
      as: 'patient',
      foreignKey: 'patient_id',
    });

    this.belongsTo(models.Appointment, {
      as: 'appointment',
      foreignKey: 'appointment_id',
    });

    this.belongsTo(models.Doctor, {
      as: 'doctor',
      foreignKey: 'doctor_id',
    });

    this.hasMany(models.PatientFile, {
      as: 'files',
      foreignKey: 'clinical_record_id',
    });

    this.belongsTo(models.Pregnancy, {
      as: 'pregnancy',
      foreignKey: 'pregnancy_id',
    });

    this.hasMany(models.GeneralUltrasound, {
      as: 'generalUltrasounds',
      foreignKey: 'clinical_record_id',
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: CLINICAL_RECORD_TABLE,
      modelName: 'ClinicalRecord',
      timestamps: true,
      paranoid: true,
      underscored: true,
    };
  }
}

module.exports = { CLINICAL_RECORD_TABLE, ClinicalRecordSchema, ClinicalRecord };
