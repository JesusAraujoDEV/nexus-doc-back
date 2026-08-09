'use strict';

// Fase 2 de la migración histórica MedDig: récipe estructurado (antes un solo
// string en `treatment`) y hallazgos de ecografía (antes no migrados, viven en
// los cientos de campos genéricos de CONSULTA.DAT). Mismo patrón que
// medical_background: JSONB nullable, sin tabla nueva.
// `doctors.letterhead` guarda los datos de membrete (RIF/MPPS/CM/dirección/
// teléfonos) que hoy están hardcodeados en la impresión de MedDig.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clinical_records', 'recipe_items', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('clinical_records', 'ultrasound_findings', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('doctors', 'letterhead', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('doctors', 'letterhead');
    await queryInterface.removeColumn('clinical_records', 'ultrasound_findings');
    await queryInterface.removeColumn('clinical_records', 'recipe_items');
  },
};
