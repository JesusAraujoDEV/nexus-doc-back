const { Model, DataTypes, Sequelize } = require('sequelize');

const ICD10_CODE_TABLE = 'icd10_codes';

const Icd10CodeSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    code: { allowNull: true, type: DataTypes.STRING },
    title: { allowNull: false, type: DataTypes.TEXT },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class Icd10Code extends Model {
    static associate() {}

    static config(sequelize) {
        return { sequelize, tableName: ICD10_CODE_TABLE, modelName: 'Icd10Code', timestamps: true, underscored: true };
    }
}

module.exports = { ICD10_CODE_TABLE, Icd10CodeSchema, Icd10Code };
