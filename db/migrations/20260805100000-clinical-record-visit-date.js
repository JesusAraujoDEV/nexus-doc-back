'use strict';

// La historia clínica importada de MedDig/VRunner tiene una fecha de consulta
// real (campo FECHA de CONSULTA.DAT) que no tenía dónde guardarse: la tabla
// solo tenía created_at con DEFAULT NOW, así que toda la historia de 2020-2026
// quedó fechada el día de la importación y el frontend mostraba created_at
// como si fuera la fecha de la consulta.
//
// Se agrega también lab_orders: los exámenes indicados viven en ORDEN-EX.DAT y
// no tenían columna, así que se perdían por completo.
//
// legacy_record_id pasa a ser único para que la importación sea idempotente y
// no se puedan duplicar consultas en una recarga.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clinical_records', 'visit_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('clinical_records', 'lab_orders', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // el historial se lista por paciente ordenado por fecha
    await queryInterface.addIndex('clinical_records', ['patient_id', 'visit_date'], {
      name: 'clinical_records_patient_id_visit_date_idx',
    });

    await queryInterface.addIndex('clinical_records', ['legacy_record_id'], {
      name: 'clinical_records_legacy_record_id_uk',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clinical_records', 'clinical_records_legacy_record_id_uk');
    await queryInterface.removeIndex('clinical_records', 'clinical_records_patient_id_visit_date_idx');
    await queryInterface.removeColumn('clinical_records', 'lab_orders');
    await queryInterface.removeColumn('clinical_records', 'visit_date');
  },
};
