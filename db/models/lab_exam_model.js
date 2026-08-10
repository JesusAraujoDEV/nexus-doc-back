const { Model, DataTypes, Sequelize } = require('sequelize');

const LAB_EXAM_TABLE = 'lab_exams';

const LabExamSchema = {
    id: { allowNull: false, primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    legacyCode: { allowNull: true, type: DataTypes.INTEGER, unique: true, field: 'legacy_code' },
    name: { allowNull: false, type: DataTypes.TEXT },
    isGroup: { allowNull: false, type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_group' },
    // Categoria del filtro (Quimicos/Bioquimicos/Hematicos/Microbiologicos/Otros); ver
    // libs/lab-exam-categories.js. Sembrada de TP-EXM legado, editable por la doctora.
    category: { allowNull: true, type: DataTypes.INTEGER },
    createdAt: { allowNull: false, type: DataTypes.DATE, field: 'created_at', defaultValue: Sequelize.NOW },
    updatedAt: { allowNull: false, type: DataTypes.DATE, field: 'updated_at', defaultValue: Sequelize.NOW },
};

class LabExam extends Model {
    static associate(models) {
        this.hasMany(models.LabExamOrder, { as: 'orders', foreignKey: 'exam_id' });
    }

    static config(sequelize) {
        return { sequelize, tableName: LAB_EXAM_TABLE, modelName: 'LabExam', timestamps: true, underscored: true };
    }
}

module.exports = { LAB_EXAM_TABLE, LabExamSchema, LabExam };
