const { Model, DataTypes, Sequelize } = require('sequelize');

const LEGACY_SYNC_RUN_TABLE = 'legacy_sync_runs';

const LegacySyncRunSchema = {
  id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
  // running | done | needs_review | failed
  status: { allowNull: false, type: DataTypes.STRING(20) },
  source: { allowNull: false, type: DataTypes.JSONB, defaultValue: {} },
  summary: { allowNull: false, type: DataTypes.JSONB, defaultValue: {} },
  message: { allowNull: true, type: DataTypes.TEXT },
  log: { allowNull: true, type: DataTypes.TEXT },
  createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
  finishedAt: { allowNull: true, type: DataTypes.DATE, field: 'finished_at' },
};

class LegacySyncRun extends Model {
  static associate() {}

  static config(sequelize) {
    return {
      sequelize,
      tableName: LEGACY_SYNC_RUN_TABLE,
      modelName: 'LegacySyncRun',
      timestamps: false,
      underscored: true,
    };
  }
}

module.exports = { LEGACY_SYNC_RUN_TABLE, LegacySyncRunSchema, LegacySyncRun };
