/**
 * Importa los pacientes extraídos de MedDig/VRunner (nexusdoc/data/output) a producción.
 * No importa clinical_records: el vínculo consulta->paciente no está confirmado
 * todavía (ver docs/decisions/0001-legacy-meddig-import.md).
 *
 * Uso: DB_URL=... node scripts/import-legacy-patients.js <ruta-json-pacientes> <doctorId>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

function splitName(nombre) {
    const parts = (nombre || '').trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0] || 'Sin nombre', lastName: '' };
    const mid = Math.ceil(parts.length / 2);
    return { firstName: parts.slice(0, mid).join(' '), lastName: parts.slice(mid).join(' ') };
}

/** Claves tal como las emite 08_decodificador.js (header binario, mayúsculas con guiones). */
function buildMedicalBackground(p) {
    const bg = {};
    if (p.ALERGIAS) bg.alergias = p.ALERGIAS;
    if (p['CIR-PREV']) bg.cirugiasPrevias = p['CIR-PREV'];
    return bg;
}

function buildPatientRow(p, doctorId) {
    const { firstName, lastName } = splitName(p.NOMBRE);
    return {
        doctorId,
        firstName,
        lastName,
        address: p.DIRECCION || null,
        medicalBackground: buildMedicalBackground(p),
        legacyRecordId: p.id,
    };
}

async function main() {
    const [, , jsonPath, doctorId] = process.argv;
    if (!jsonPath || !doctorId) {
        console.error('Uso: node scripts/import-legacy-patients.js <ruta-json> <doctorId>');
        process.exit(1);
    }

    const pacientes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const rows = pacientes.map((p) => buildPatientRow(p, doctorId));
    const result = await models.Patient.bulkCreate(rows, { validate: true });
    console.log('Pacientes importados:', result.length, '/', pacientes.length);

    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
