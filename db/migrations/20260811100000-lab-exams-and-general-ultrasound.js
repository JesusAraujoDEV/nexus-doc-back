'use strict';

// lab_exams (catalog) already exists (20260804160000-legacy-catalogs.js), global/no
// doctor_id - reference data, matches the existing medications/diagnoses/labs pattern.
// This migration only adds the missing `category` column to it, plus the two new
// tables (orders/results, general ultrasound) and two per-consultation flags.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lab_exams', 'category', {
      allowNull: true,
      type: Sequelize.INTEGER,
    });

    await queryInterface.createTable('lab_exam_orders', {
      id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
      exam_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'lab_exams', key: 'id' } },
      patient_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'patients', key: 'id' } },
      doctor_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'doctors', key: 'id' } },
      ordered_record_id: { allowNull: true, type: Sequelize.UUID, references: { model: 'clinical_records', key: 'id' }, onDelete: 'SET NULL' },
      result_record_id: { allowNull: true, type: Sequelize.UUID, references: { model: 'clinical_records', key: 'id' }, onDelete: 'SET NULL' },
      ordered_date: { allowNull: true, type: Sequelize.DATEONLY },
      performed_date: { allowNull: true, type: Sequelize.DATEONLY },
      result_value: { allowNull: true, type: Sequelize.TEXT },
      result_observations: { allowNull: true, type: Sequelize.TEXT },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE lab_exam_orders ADD CONSTRAINT lab_exam_orders_has_a_record
      CHECK (ordered_record_id IS NOT NULL OR result_record_id IS NOT NULL)
    `);
    await queryInterface.addIndex('lab_exam_orders', ['patient_id']);

    await queryInterface.createTable('general_ultrasounds', {
      id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
      clinical_record_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'clinical_records', key: 'id' }, onDelete: 'CASCADE' },
      sub_type: { allowNull: false, type: Sequelize.STRING },
      findings: { allowNull: true, type: Sequelize.JSONB },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('general_ultrasounds', ['clinical_record_id', 'sub_type'], {
      unique: true,
      name: 'general_ultrasounds_record_subtype_unique',
    });

    await queryInterface.addColumn('clinical_records', 'indicates_prescription', {
      allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false,
    });
    await queryInterface.addColumn('clinical_records', 'indicates_imaging_study', {
      allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clinical_records', 'indicates_imaging_study');
    await queryInterface.removeColumn('clinical_records', 'indicates_prescription');
    await queryInterface.dropTable('general_ultrasounds');
    await queryInterface.dropTable('lab_exam_orders');
    await queryInterface.removeColumn('lab_exams', 'category');
  },
};
