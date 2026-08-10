'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'weight_kg', {
      allowNull: true,
      type: Sequelize.DECIMAL(5, 2),
    });
    await queryInterface.addColumn('patients', 'height_cm', {
      allowNull: true,
      type: Sequelize.DECIMAL(5, 2),
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('patients', 'weight_kg');
    await queryInterface.removeColumn('patients', 'height_cm');
  },
};
