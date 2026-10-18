'use strict';

// Bitácora de sincronizaciones automáticas desde la laptop de la doctora
// (data/sync-laptop). Una fila por envío: qué llegó, qué se cargó y el log.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('legacy_sync_runs', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      // running | done | needs_review | failed
      status: { type: Sequelize.STRING(20), allowNull: false },
      source: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      summary: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      message: { type: Sequelize.TEXT, allowNull: true },
      log: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      finished_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('legacy_sync_runs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('legacy_sync_runs');
  },
};
