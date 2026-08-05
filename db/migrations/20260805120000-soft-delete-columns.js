'use strict';

// Borrado lógico: agrega deleted_at a patients y clinical_records.
// Con Sequelize paranoid mode, los queries normales excluyen automáticamente
// las filas con deleted_at NOT NULL, y destroy() pone la fecha en vez de
// borrar la fila.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('clinical_records', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('clinical_records', 'deleted_at');
    await queryInterface.removeColumn('patients', 'deleted_at');
  },
};
