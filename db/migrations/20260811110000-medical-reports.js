'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('referring_doctors', {
      id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
      name: { allowNull: false, type: Sequelize.TEXT },
      specialty: { allowNull: true, type: Sequelize.TEXT },
      legacy_code: { allowNull: true, type: Sequelize.INTEGER, unique: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addColumn('patients', 'referred_by_doctor_id', {
      allowNull: true,
      type: Sequelize.UUID,
      references: { model: 'referring_doctors', key: 'id' },
    });

    await queryInterface.createTable('medical_reports', {
      id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
      clinical_record_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'clinical_records', key: 'id' }, onDelete: 'CASCADE' },
      patient_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'patients', key: 'id' } },
      doctor_id: { allowNull: false, type: Sequelize.UUID, references: { model: 'doctors', key: 'id' } },
      type: { allowNull: false, type: Sequelize.STRING }, // 'informe' | 'constancia'
      title: { allowNull: true, type: Sequelize.TEXT },
      referring_doctor_id: { allowNull: true, type: Sequelize.UUID, references: { model: 'referring_doctors', key: 'id' } },
      medical_center_id: { allowNull: true, type: Sequelize.UUID, references: { model: 'medical_centers', key: 'id' } },
      content: { allowNull: true, type: Sequelize.TEXT },
      constancia_text: { allowNull: true, type: Sequelize.TEXT },
      realizandose_text: { allowNull: true, type: Sequelize.TEXT },
      indicates_rest: { allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('medical_reports', ['clinical_record_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('medical_reports');
    await queryInterface.removeColumn('patients', 'referred_by_doctor_id');
    await queryInterface.dropTable('referring_doctors');
  },
};
