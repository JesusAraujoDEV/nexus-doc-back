'use strict';

// Campos del legacy MedDig que no tenían dónde vivir. Todas las columnas son
// opcionales: las consultas nuevas pueden usarlas, pero no se exigen.
//
// clinical_records
//   evolution              CONSULTA.EVOLUCION (texto libre de evolución)
//   recommendations        CONSULTA.RECOMENDACIONES (indicaciones)
//   medical_certificate    constancia médica: { diagnostico, motivo, reposo, diasReposo }
//                          (CONSULTA.DAIG-CONST, TRAT-CONST, REPOSO, DIAS-REPOSO)
//   diagnostic_impressions impresiones diagnósticas resueltas desde IDXS-X-C + TAB-GENE,
//                          lista de textos (hasta 3 por consulta)
// patients
//   email                  PACIENTE.EMAIL
//   phone_secondary        PACIENTE.TELEFONO cuando hay celular distinto en `phone`
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clinical_records', 'evolution', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('clinical_records', 'recommendations', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('clinical_records', 'medical_certificate', { type: Sequelize.JSONB, allowNull: true });
    await queryInterface.addColumn('clinical_records', 'diagnostic_impressions', { type: Sequelize.JSONB, allowNull: true });
    await queryInterface.addColumn('patients', 'email', { type: Sequelize.STRING(254), allowNull: true });
    await queryInterface.addColumn('patients', 'phone_secondary', { type: Sequelize.STRING(30), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patients', 'phone_secondary');
    await queryInterface.removeColumn('patients', 'email');
    await queryInterface.removeColumn('clinical_records', 'diagnostic_impressions');
    await queryInterface.removeColumn('clinical_records', 'medical_certificate');
    await queryInterface.removeColumn('clinical_records', 'recommendations');
    await queryInterface.removeColumn('clinical_records', 'evolution');
  },
};
