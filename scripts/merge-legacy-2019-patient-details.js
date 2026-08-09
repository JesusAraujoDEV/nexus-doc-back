/**
 * Completa (sin pisar) los campos de identidad de los ~774 pacientes que se
 * fusionaron por cédula durante sync-legacy-history.js: si el registro de 2019
 * trae un dato que en producción está vacío (dirección, alergias, cirugías,
 * notas, teléfono...), lo agrega. Nunca sobrescribe un valor ya presente.
 *
 * Uso:
 *   DB_URL=... node scripts/merge-legacy-2019-patient-details.js            (dry-run)
 *   DB_URL=... node scripts/merge-legacy-2019-patient-details.js --apply
 */
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');
const { cedulasDuplicadas, cedulaUsable } = require('./legacy-import-helpers');

function parseDDMMYYYY(s) {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || '');
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function buildMissingFields(p, existente) {
    const update = {};
    if (!existente.historyNumber && p.HISTORIA) update.historyNumber = p.HISTORIA;
    if (!existente.birthDate) {
        const bd = parseDDMMYYYY(p['FECH-NAC']);
        if (bd) update.birthDate = bd;
    }
    if (!existente.phone && p.CELULAR) update.phone = p.CELULAR;
    if (!existente.address && p.DIRECCION) update.address = p.DIRECCION;
    if (!existente.gender && (p.SEXO === 'F' || p.SEXO === 'M')) update.gender = p.SEXO === 'F' ? 'Femenino' : 'Masculino';

    const bg = { ...(existente.medicalBackground || {}) };
    let bgChanged = false;
    if (!bg.ocupacion && p.OCUPACION) { bg.ocupacion = p.OCUPACION; bgChanged = true; }
    if (!bg.lugarNacimiento && p['LUG-NAC']) { bg.lugarNacimiento = p['LUG-NAC']; bgChanged = true; }
    if (!bg.alergias && p.ALERGIAS) { bg.alergias = p.ALERGIAS; bgChanged = true; }
    if (!bg.cirugiasPrevias && p['CIR-PREV']) { bg.cirugiasPrevias = p['CIR-PREV']; bgChanged = true; }
    if (!bg.notas && p['OTROS-GIN']) { bg.notas = p['OTROS-GIN']; bgChanged = true; }
    if (bgChanged) update.medicalBackground = bg;

    return update;
}

async function main() {
    const apply = process.argv.includes('--apply');
    const jsonPath = path.join(__dirname, '..', '..', 'data', 'output', 'pacientes_decodificados_2019.json');
    const pacientes2019 = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const dup = cedulasDuplicadas(pacientes2019);
    const porCedula = new Map();
    for (const p of pacientes2019) {
        const ced = cedulaUsable(p, dup);
        if (ced) porCedula.set(ced, p);
    }

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const existentes = await models.Patient.findAll({ raw: true });
    const plan = [];
    for (const existente of existentes) {
        if (!existente.cedula || !porCedula.has(existente.cedula)) continue;
        const update = buildMissingFields(porCedula.get(existente.cedula), existente);
        if (Object.keys(update).length) plan.push({ id: existente.id, update });
    }
    console.log(`Pacientes fusionados con campos por completar: ${plan.length}`);

    if (!apply) {
        console.log(JSON.stringify(plan.slice(0, 3), null, 2));
        console.log('\nDry-run. Nada escrito. Volver a correr con --apply para aplicar.');
        await sequelize.close();
        return;
    }

    for (const { id, update } of plan) {
        await models.Patient.update(update, { where: { id } });
    }
    console.log(`Aplicado: ${plan.length} pacientes actualizados.`);
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
