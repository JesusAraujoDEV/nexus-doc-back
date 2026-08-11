const { Model, DataTypes, Sequelize } = require('sequelize');

const REFERRING_DOCTOR_TABLE = 'referring_doctors';

const ReferringDoctorSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    name: { allowNull: false, type: DataTypes.TEXT },
    specialty: { allowNull: true, type: DataTypes.TEXT },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class ReferringDoctor extends Model {
    static associate() {}

    static config(sequelize) {
        return { sequelize, tableName: REFERRING_DOCTOR_TABLE, modelName: 'ReferringDoctor', timestamps: true, underscored: true };
    }
}

module.exports = { REFERRING_DOCTOR_TABLE, ReferringDoctorSchema, ReferringDoctor };
