/**
 * Importa pacientes extraídos de MedDig/VRunner (nexusdoc/data/output) a producción.
 * Usa el mismo mapeo que sync-legacy-history.js (legacy-import-helpers): cédula,
 * teléfono, fecha de nacimiento, historia, sexo, dirección y antecedentes.
 *
 * Antes este script solo grababa nombre y dirección: las 87 pacientes de la
 * carga del 2026-10-16 quedaron sin cédula ni teléfono (corregido con
 * fill-legacy-patient-contact.js).
 *
 * Solo inserta pacientes cuyo legacy_record_id no existe todavía.
 *
 * Uso: node -r dotenv/config scripts/import-legacy-patients.js <ruta-json-pacientes> <doctorId> [--apply]
 */
const fs = require('fs');
const { Sequelize, Op } = require('sequelize');
const { setupModels } = require('../db/models');
const { cedulasDuplicadas, cedulaUsable, buildPatientRow } = require('./legacy-import-helpers');

async function main() {
    const [, , jsonPath, doctorId] = process.argv;
    const apply = process.argv.includes('--apply');
    if (!jsonPath || !doctorId) {
        console.error('Uso: node scripts/import-legacy-patients.js <ruta-json> <doctorId> [--apply]');
        process.exit(1);
    }

    const pacientes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const existentes = await models.Patient.findAll({
        attributes: ['legacyRecordId', 'cedula'],
        where: { legacyRecordId: { [Op.not]: null } },
        paranoid: false,
        raw: true,
    });
    const yaCargados = new Set(existentes.map((p) => p.legacyRecordId));
    const cedulasUsadas = new Set(existentes.map((p) => p.cedula).filter(Boolean));
    const dup = cedulasDuplicadas(pacientes);

    const rows = pacientes
        .filter((p) => !yaCargados.has(p.id))
        .map((p) => {
            const ced = cedulaUsable(p, dup);
            return buildPatientRow(p, doctorId, p.id, ced && !cedulasUsadas.has(ced) ? ced : null);
        });
    console.log(`Pacientes nuevos: ${rows.length} de ${pacientes.length}`);

    if (!apply) {
        console.log('Dry-run. Nada escrito.');
        await sequelize.close();
        return;
    }
    const result = await models.Patient.bulkCreate(rows, { validate: true });
    console.log('Pacientes importados:', result.length);
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
