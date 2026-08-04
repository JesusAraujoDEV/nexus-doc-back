/**
 * Importa los 6 catálogos de referencia recuperados de MedDig/VRunner.
 * Uso: DB_URL=... node scripts/import-legacy-catalogs.js
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

const DATA_DIR = '../data/output';

const CATALOGS = [
    {
        model: 'MedicalCenter',
        file: 'catalogo_centros_medicos.json',
        map: (r) => ({ legacyCode: r.CODIGO, name: r.NOMBRE, address: r.DIRECCION || null }),
    },
    {
        model: 'DiagnosisCatalog',
        file: 'catalogo_diagnosticos.json',
        map: (r) => ({ legacyCode: r.CODIGO, name: r.NOMBRE, icd10Code: r['COD-CIE10'] || null }),
    },
    {
        model: 'Lab',
        file: 'catalogo_laboratorios.json',
        map: (r) => ({ legacyCode: r.CODIGO, name: r.NOMBRE }),
    },
    {
        model: 'Medication',
        file: 'catalogo_farmacos.json',
        map: (r) => ({
            legacyCode: r.CODIGO,
            commercialName: r.NOMBRE,
            genericName: r['NOM-GEN'] || null,
            presentation: r.PRESE || null,
            legacyLabCode: r.LABORATORIOS || null,
        }),
    },
    {
        model: 'LabExam',
        file: 'catalogo_examenes_laboratorio.json',
        map: (r) => ({ legacyCode: r.CODIGO, name: r.NOMBRE, isGroup: Boolean(r['ES-GRUPO']) }),
    },
    {
        model: 'Icd10Code',
        file: 'catalogo_cie10.json',
        filter: (r) => Boolean(r.TITULO),
        map: (r) => ({ legacyCode: r.CODIGO, code: r['CODIGO-CIE'] || null, title: r.TITULO }),
    },
];

async function importCatalog(models, { model, file, map, filter }) {
    const records = JSON.parse(fs.readFileSync(`${DATA_DIR}/${file}`, 'utf8'));
    const usable = filter ? records.filter(filter) : records;
    const rows = usable.map(map);
    const result = await models[model].bulkCreate(rows, { validate: true });
    console.log(model + ':', result.length, '/', records.length, filter ? `(${records.length - usable.length} omitidos)` : '');
}

async function main() {
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    for (const catalog of CATALOGS) {
        await importCatalog(sequelize.models, catalog);
    }
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
