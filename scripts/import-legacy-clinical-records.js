/**
 * Importa las consultas extraídas de MedDig/VRunner, vinculadas a su paciente
 * real vía el offset 1009 (puntero PACIENTES decodificado empíricamente).
 * Requiere que import-legacy-patients.js ya haya corrido (usa legacy_record_id
 * de patients para resolver el UUID de cada paciente).
 *
 * Uso: DB_URL=... node scripts/import-legacy-clinical-records.js <ruta-json> <doctorId>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

function buildClinicalRecordRow(c, doctorId, patientId) {
    return {
        patientId,
        doctorId,
        symptoms: c.motivo || null,
        diagnosis: c.diagnostico || null,
        privateNotes: c.observacion || null,
        visitType: c.tipoConsulta || c.resumen || null,
        legacyRecordId: c.id,
    };
}

async function loadLegacyIdToPatientId(models) {
    const patients = await models.Patient.findAll({
        attributes: ['id', 'legacyRecordId'],
        where: { legacyRecordId: { [Sequelize.Op.not]: null } },
        raw: true,
    });
    return new Map(patients.map((p) => [p.legacyRecordId, p.id]));
}

async function main() {
    const [, , jsonPath, doctorId] = process.argv;
    if (!jsonPath || !doctorId) {
        console.error('Uso: node scripts/import-legacy-clinical-records.js <ruta-json> <doctorId>');
        process.exit(1);
    }

    const consultas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const legacyToPatientId = await loadLegacyIdToPatientId(models);
    console.log('Pacientes con legacy_record_id en BD:', legacyToPatientId.size);

    const rows = [];
    let skipped = 0;
    for (const c of consultas) {
        const patientId = legacyToPatientId.get(c.legacyPatientId);
        if (!patientId) { skipped++; continue; }
        rows.push(buildClinicalRecordRow(c, doctorId, patientId));
    }
    console.log('Consultas sin paciente resuelto (omitidas):', skipped);

    const result = await models.ClinicalRecord.bulkCreate(rows, { validate: true });
    console.log('Consultas importadas:', result.length, '/', consultas.length);

    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
