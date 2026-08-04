const { Model, DataTypes, Sequelize } = require('sequelize');

const MEDICAL_CENTER_TABLE = 'medical_centers';

const MedicalCenterSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    name: { allowNull: false, type: DataTypes.TEXT },
    address: { allowNull: true, type: DataTypes.TEXT },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class MedicalCenter extends Model {
    static associate() {}

    static config(sequelize) {
        return { sequelize, tableName: MEDICAL_CENTER_TABLE, modelName: 'MedicalCenter', timestamps: true, underscored: true };
    }
}

module.exports = { MEDICAL_CENTER_TABLE, MedicalCenterSchema, MedicalCenter };
