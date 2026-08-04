'use strict';

// El catálogo CIED de VRunner mezcla códigos CIE-10 oficiales con términos
// libres agregados por la doctora (NIVEL1/2/3 = 0, sin código oficial).
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('icd10_codes', 'code', { type: Sequelize.STRING, allowNull: true });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('icd10_codes', 'code', { type: Sequelize.STRING, allowNull: false });
    },
};
