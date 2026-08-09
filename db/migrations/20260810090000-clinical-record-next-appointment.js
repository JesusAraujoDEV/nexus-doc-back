'use strict';

// Fecha de la próxima cita, definida al cierre de la consulta actual (parte de
// lo que la Dra. Arteaga llena en cada consulta real).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('clinical_records', 'next_appointment_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clinical_records', 'next_appointment_date');
  },
};
