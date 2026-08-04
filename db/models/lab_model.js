const { Model, DataTypes, Sequelize } = require('sequelize');

const LAB_TABLE = 'labs';

const LabSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    name: { allowNull: false, type: DataTypes.TEXT },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class Lab extends Model {
    static associate() {}

    static config(sequelize) {
        return { sequelize, tableName: LAB_TABLE, modelName: 'Lab', timestamps: true, underscored: true };
    }
}

module.exports = { LAB_TABLE, LabSchema, Lab };
