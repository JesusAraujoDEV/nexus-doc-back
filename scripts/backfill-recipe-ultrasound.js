/**
 * Rellena recipe_items y ultrasound_findings en clinical_records ya migrados,
 * cruzando por legacy_record_id contra los JSON generados por
 * data/scripts/analisis/19_extraer_ecografia_recipe.js. Usa el mismo esquema
 * de offset que sync-legacy-history.js: v2 sin offset, 2019 con +1000000.
 *
 * Uso:
 *   DB_URL=... node scripts/backfill-recipe-ultrasound.js            (dry-run)
 *   DB_URL=... node scripts/backfill-recipe-ultrasound.js --apply
 */
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

const DATA_OUT = path.join(__dirname, '..', '..', 'data', 'output');
const OFFSET_CONSULTAS_2019 = 1000000;
const LOTE = 500;

function leer(nombre) {
    return JSON.parse(fs.readFileSync(path.join(DATA_OUT, nombre), 'utf8'));
}

/** ecografias_*.json trae {legacyRecordId, ecografia}; recipe_items_*.json trae [["paciente-consulta", items[]], ...]. */
function indexar(nombreCarpeta, sufijoConsultas, offset) {
    const ecografias = leer(`ecografias_${nombreCarpeta}.json`);
    const ecoPorLegacyId = new Map(ecografias.map((e) => [offset + e.legacyRecordId, e.ecografia]));

    // recipe_items está indexado por paciente-consulta, no por legacyRecordId de CONSULTA.DAT;
    // hace falta el JSON de consultas consolidado (mismo que usó sync-legacy-history.js) para
    // traducir paciente-consulta -> legacyRecordId de la fila.
    const consultas = leer(`consultas_corregidas_${sufijoConsultas}.json`);
    const recipeCrudo = new Map(leer(`recipe_items_${nombreCarpeta}.json`));
    const recipePorLegacyId = new Map();
    for (const c of consultas) {
        const items = recipeCrudo.get(`${c.legacyPatientId}-${c.nroConsulta}`);
        if (items && items.length) recipePorLegacyId.set(offset + c.legacyRecordId, items);
    }

    return { ecoPorLegacyId, recipePorLegacyId };
}

async function main() {
    const apply = process.argv.includes('--apply');

    const v2 = indexar('CONSULTA_2021_v2', '2021v2', 0);
    const y2019 = indexar('CONSULTA_2019', '2019', OFFSET_CONSULTAS_2019);
    const ecoPorLegacyId = new Map([...v2.ecoPorLegacyId, ...y2019.ecoPorLegacyId]);
    const recipePorLegacyId = new Map([...v2.recipePorLegacyId, ...y2019.recipePorLegacyId]);
    console.log(`Ecografías a aplicar: ${ecoPorLegacyId.size}, récipes a aplicar: ${recipePorLegacyId.size}`);

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const registros = await models.ClinicalRecord.findAll({
        attributes: ['id', 'legacyRecordId'],
        where: { legacyRecordId: { [Sequelize.Op.not]: null } },
        raw: true,
    });
    console.log(`Consultas en BD con legacy_record_id: ${registros.length}`);

    const plan = [];
    for (const r of registros) {
        const recipeItems = recipePorLegacyId.get(r.legacyRecordId) || null;
        const ultrasoundFindings = ecoPorLegacyId.get(r.legacyRecordId) || null;
        if (recipeItems || ultrasoundFindings) plan.push({ id: r.id, recipeItems, ultrasoundFindings });
    }
    console.log(`Filas a actualizar: ${plan.length}`);

    if (!apply) {
        console.log('\nDry-run. Nada escrito. Volver a correr con --apply para aplicar.');
        await sequelize.close();
        return;
    }

    for (let i = 0; i < plan.length; i += LOTE) {
        await Promise.all(plan.slice(i, i + LOTE).map(({ id, recipeItems, ultrasoundFindings }) =>
            models.ClinicalRecord.update({ recipeItems, ultrasoundFindings }, { where: { id } })));
    }
    console.log('Aplicado.');
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
