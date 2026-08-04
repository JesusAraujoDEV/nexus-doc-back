/**
 * Actualiza cedula/birth_date/phone/gender/historyNumber + antecedentes en
 * medical_background (merge, no overwrite) de los pacientes ya migrados,
 * cruzando por legacy_record_id contra output/pacientes_decodificados.json.
 *
 * Cédulas duplicadas o con formato no numérico (6-9 dígitos) se dejan sin
 * tocar — patients.cedula tiene constraint unique, y ese dato viene sucio
 * del sistema origen (ver BITACORA-INVESTIGACION.md sección 7).
 *
 * Uso:
 *   DB_URL=... node scripts/update-legacy-patient-details.js <ruta-json>            (dry-run, no escribe)
 *   DB_URL=... node scripts/update-legacy-patient-details.js <ruta-json> --apply    (escribe)
 */
const fs = require('fs');
const { Sequelize, Op } = require('sequelize');
const { setupModels } = require('../db/models');

function parseDDMMYYYY(s) {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || '');
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
}

function findDuplicateCedulas(records) {
    const counts = new Map();
    for (const r of records) {
        if (!r.cedula) continue;
        counts.set(r.cedula, (counts.get(r.cedula) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c));
}

function isUsableCedula(cedula, duplicates) {
    return /^\d{6,9}$/.test(cedula || '') && !duplicates.has(cedula);
}

function buildUpdate(r, duplicates, existingBackground) {
    const update = {};
    if (isUsableCedula(r.cedula, duplicates)) update.cedula = r.cedula;
    if (isUsableCedula(r.historia, duplicates)) update.historyNumber = r.historia;
    const birthDate = parseDDMMYYYY(r.fechaNac);
    if (birthDate) update.birthDate = birthDate;
    if (r.celular) update.phone = r.celular;
    if (r.sexo === 'F' || r.sexo === 'M') update.gender = r.sexo === 'F' ? 'Femenino' : 'Masculino';

    const background = { ...existingBackground };
    if (r.ocupacion) background.ocupacion = r.ocupacion;
    const gineco = {};
    if (r.menarquia) gineco.menarquia = r.menarquia;
    if (r.numEmb !== undefined) gineco.gestas = r.numEmb;
    if (r.numPar !== undefined) gineco.partos = r.numPar;
    if (r.numCes !== undefined) gineco.cesareas = r.numCes;
    if (r.numAbo !== undefined) gineco.abortos = r.numAbo;
    if (r.irs !== undefined) gineco.irs = r.irs;
    if (Object.keys(gineco).length) background.antecedentesGinecoObs = gineco;
    if (Object.keys(background).length) update.medicalBackground = background;

    return update;
}

async function main() {
    const jsonPath = process.argv[2];
    const apply = process.argv.includes('--apply');
    if (!jsonPath) {
        console.error('Uso: node scripts/update-legacy-patient-details.js <ruta-json> [--apply]');
        process.exit(1);
    }

    const records = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const duplicates = findDuplicateCedulas(records);
    console.log('Cédulas duplicadas detectadas (se omiten):', duplicates.size);

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const patients = await models.Patient.findAll({
        where: { legacyRecordId: { [Op.not]: null } },
        raw: true,
    });
    const patientByLegacyId = new Map(patients.map((p) => [p.legacyRecordId, p]));
    console.log('Pacientes en BD con legacy_record_id:', patientByLegacyId.size);

    let toUpdate = 0, noMatch = 0, cedulaSet = 0, birthDateSet = 0, phoneSet = 0;
    const plan = [];
    for (const r of records) {
        const patient = patientByLegacyId.get(r.id);
        if (!patient) { noMatch++; continue; }
        const update = buildUpdate(r, duplicates, patient.medicalBackground || {});
        if (Object.keys(update).length === 0) continue;
        toUpdate++;
        if (update.cedula) cedulaSet++;
        if (update.birthDate) birthDateSet++;
        if (update.phone) phoneSet++;
        plan.push({ id: patient.id, update });
    }

    console.log('--- Plan ---');
    console.log('Filas a actualizar:', toUpdate, '| sin match en BD:', noMatch);
    console.log('  cedula se setea en:', cedulaSet);
    console.log('  birthDate se setea en:', birthDateSet);
    console.log('  phone se setea en:', phoneSet);
    console.log('Ejemplo (paciente #1 si está):', JSON.stringify(plan.find((p) => records.find((r) => r.id === 1)?.id) || plan[0]));

    if (!apply) {
        console.log('\nDry-run. Nada escrito. Volver a correr con --apply para aplicar.');
        await sequelize.close();
        return;
    }

    let applied = 0;
    for (const { id, update } of plan) {
        await models.Patient.update(update, { where: { id } });
        applied++;
    }
    console.log('Aplicado:', applied, 'filas actualizadas.');
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
