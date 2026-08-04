const { Model, DataTypes, Sequelize } = require('sequelize');

const MEDICATION_TABLE = 'medications';

const MedicationSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    commercialName: { allowNull: false, type: DataTypes.TEXT, field: 'commercial_name' },
    genericName: { allowNull: true, type: DataTypes.TEXT, field: 'generic_name' },
    presentation: { allowNull: true, type: DataTypes.TEXT },
    legacyLabCode: { allowNull: true, type: DataTypes.INTEGER, field: 'legacy_lab_code' },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class Medication extends Model {
    static associate() {}

    static config(sequelize) {
        return { sequelize, tableName: MEDICATION_TABLE, modelName: 'Medication', timestamps: true, underscored: true };
    }
}

module.exports = { MEDICATION_TABLE, MedicationSchema, Medication };
