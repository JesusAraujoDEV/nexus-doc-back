'use strict';

// Tablas de catálogo/referencia recuperadas del sistema legado MedDig/VRunner:
// centros médicos, diagnósticos, fármacos, exámenes de laboratorio, laboratorios
// fabricantes y el catálogo CIE-10 completo. Todas son datos de referencia
// (no PII), sin FKs forzadas entre ellas porque la relación real (ej. fármaco
// -> laboratorio) no está completamente resuelta en el legado.
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('medical_centers', {
            id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
            legacyCode: { type: Sequelize.INTEGER, allowNull: true, unique: true, field: 'legacy_code' },
            name: { type: Sequelize.TEXT, allowNull: false },
            address: { type: Sequelize.TEXT, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.NOW },
        });

        await queryInterface.createTable('diagnoses_catalog', {
            id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
            legacyCode: { type: Sequelize.INTEGER, allowNull: true, unique: true, field: 'legacy_code' },
            name: { type: Sequelize.TEXT, allowNull: false },
            icd10Code: { type: Sequelize.STRING, allowNull: true, field: 'icd10_code' },
            createdAt: { type: Sequelize.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.NOW },
        });

        await queryInterface.createTable('labs', {
            id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
            legacyCode: { type: Sequelize.INTEGER, allowNull: true, unique: true, field: 'legacy_code' },
            name: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.NOW },
        });

        await queryInterface.createTable('medications', {
            id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
            legacyCode: { type: Sequelize.INTEGER, allowNull: true, unique: true, field: 'legacy_code' },
            commercialName: { type: Sequelize.TEXT, allowNull: false, field: 'commercial_name' },
            genericName: { type: Sequelize.TEXT, allowNull: true, field: 'generic_name' },
            presentation: { type: Sequelize.TEXT, allowNull: true },
            legacyLabCode: { type: Sequelize.INTEGER, allowNull: true, field: 'legacy_lab_code' },
            createdAt: { type: Sequelize.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.NOW },
        });

        await queryInterface.createTable('lab_exams', {
            id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
            legacyCode: { type: Sequelize.INTEGER, allowNull: true, unique: true, field: 'legacy_code' },
            name: { type: Sequelize.TEXT, allowNull: false },
            isGroup: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_group' },
            createdAt: { type: Sequelize.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.NOW },
        });

        await queryInterface.createTable('icd10_codes', {
            id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
            legacyCode: { type: Sequelize.INTEGER, allowNull: true, unique: true, field: 'legacy_code' },
            code: { type: Sequelize.STRING, allowNull: false },
            title: { type: Sequelize.TEXT, allowNull: false },
            createdAt: { type: Sequelize.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.NOW },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('icd10_codes');
        await queryInterface.dropTable('lab_exams');
        await queryInterface.dropTable('medications');
        await queryInterface.dropTable('labs');
        await queryInterface.dropTable('diagnoses_catalog');
        await queryInterface.dropTable('medical_centers');
    },
};
