const { Model, DataTypes, Sequelize } = require('sequelize');

const DIAGNOSIS_CATALOG_TABLE = 'diagnoses_catalog';

const DiagnosisCatalogSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    name: { allowNull: false, type: DataTypes.TEXT },
    icd10Code: { allowNull: true, type: DataTypes.STRING, field: 'icd10_code' },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class DiagnosisCatalog extends Model {
    static associate() {}

    static config(sequelize) {
        return { sequelize, tableName: DIAGNOSIS_CATALOG_TABLE, modelName: 'DiagnosisCatalog', timestamps: true, underscored: true };
    }
}

module.exports = { DIAGNOSIS_CATALOG_TABLE, DiagnosisCatalogSchema, DiagnosisCatalog };
