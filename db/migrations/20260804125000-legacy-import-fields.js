'use strict';

// Migración para dar cabida a la importación histórica del sistema MedDig/VRunner.
// `patients.address` (TEXT) y `patients.medical_background` (JSONB) ya existen
// (agregados por otra migración de producción, 20260221120000) y se reutilizan
// para dirección y antecedentes/alergias/cirugías/hábitos respectivamente — no
// se duplican columnas. `cedula`/`phone`/`birth_date` ya son nullable ahí también.
// Lo que falta: trazabilidad al registro original y flexibilizar clinical_records.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'legacy_record_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true,
    });

    await queryInterface.changeColumn('clinical_records', 'symptoms', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.changeColumn('clinical_records', 'diagnosis', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.changeColumn('clinical_records', 'treatment', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.changeColumn('clinical_records', 'private_notes', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('clinical_records', 'visit_type', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('clinical_records', 'legacy_record_id', { type: Sequelize.INTEGER, allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('clinical_records', 'legacy_record_id');
    await queryInterface.removeColumn('clinical_records', 'visit_type');
    await queryInterface.changeColumn('clinical_records', 'private_notes', { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('clinical_records', 'treatment', { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('clinical_records', 'diagnosis', { type: Sequelize.TEXT, allowNull: false });
    await queryInterface.changeColumn('clinical_records', 'symptoms', { type: Sequelize.TEXT, allowNull: false });

    await queryInterface.removeColumn('patients', 'legacy_record_id');
  },
};
