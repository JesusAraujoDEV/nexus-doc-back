'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patients', 'history_number', {
      allowNull: true,
      type: Sequelize.STRING,
    });

    await queryInterface.addColumn('patients', 'gender', {
      allowNull: true,
      type: Sequelize.STRING,
    });

    await queryInterface.addColumn('patients', 'blood_type', {
      allowNull: true,
      type: Sequelize.STRING,
    });

    await queryInterface.addColumn('patients', 'address', {
      allowNull: true,
      type: Sequelize.TEXT,
    });

    await queryInterface.addColumn('patients', 'medical_background', {
      allowNull: true,
      type: Sequelize.JSONB,
      defaultValue: {},
    });

    await queryInterface.changeColumn('patients', 'phone', {
      allowNull: true,
      type: Sequelize.STRING,
    });

    await queryInterface.changeColumn('patients', 'birth_date', {
      allowNull: true,
      type: Sequelize.DATEONLY,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('patients', 'birth_date', {
      allowNull: false,
      type: Sequelize.DATEONLY,
    });

    await queryInterface.changeColumn('patients', 'phone', {
      allowNull: false,
      type: Sequelize.STRING,
    });

    await queryInterface.removeColumn('patients', 'medical_background');
    await queryInterface.removeColumn('patients', 'address');
    await queryInterface.removeColumn('patients', 'blood_type');
    await queryInterface.removeColumn('patients', 'gender');
    await queryInterface.removeColumn('patients', 'history_number');
  },
};
