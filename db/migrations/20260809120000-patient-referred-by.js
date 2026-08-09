'use strict';

// Cómo llegó la paciente a la consulta (redes, otro doctor, colega, amigo, otro) - la Dra.
// Arteaga lo pregunta en toda paciente nueva. `referredByDetail` guarda el detalle libre
// (ej. nombre del doctor que refirió) cuando el tipo lo amerita.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'referred_by_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('patients', 'referred_by_detail', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patients', 'referred_by_detail');
    await queryInterface.removeColumn('patients', 'referred_by_type');
  },
};
