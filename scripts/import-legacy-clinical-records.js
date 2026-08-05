/**
 * Importa la historia clínica de MedDig/VRunner a clinical_records.
 *
 * Entrada: data/output/consultas_corregidas.json, generado por
 * data/scripts/analisis/18_consolidar_consultas.js, que consolida las cuatro
 * tablas donde vive realmente cada consulta (CONSULTA, RECIPE, ORDEN-EX,
 * DIAG-X-P) y se verifica contra las capturas de VRunner antes de emitir nada.
 *
 * ─── Por qué se reescribió ────────────────────────────────────────────────
 * La primera versión cargó 6.577 consultas mal:
 *   - vinculaba al paciente con un entero leído del offset 1009, que cae
 *     dentro de un campo de TEXTO. Coincidía con el vínculo real en 0,1% de
 *     los casos, y concentraba las consultas en 246 pacientes de 2.748.
 *   - no asignaba fecha, así que created_at tomaba la hora de la importación
 *     y toda la historia de 2020-2026 aparecía fechada el día de la carga.
 *   - tratamiento y exámenes quedaban vacíos: no están en CONSULTA.DAT.
 *
 * Requiere que import-legacy-patients.js haya corrido antes (resuelve el UUID
 * de cada paciente vía patients.legacy_record_id).
 *
 * Uso:
 *   DB_URL=... node scripts/import-legacy-clinical-records.js <ruta-json> <doctorId> [--purgar]
 *
 *   --purgar  borra primero las consultas con legacy_record_id no nulo del
 *             doctor indicado. Necesario para reemplazar una carga anterior.
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

const LOTE = 500;

/** Los signos vitales solo existen en ~25 de 6.666 consultas: se anotan solo si hay algo. */
function notasSignosVitales(c) {
    const partes = [];
    if (c.taAlta || c.taBaja) partes.push(`T.A. ${c.taAlta || 0}/${c.taBaja || 0}`);
    if (c.peso) partes.push(`Peso ${c.peso}`);
    return partes.length ? partes.join('  ') : null;
}

function construirFila(c, doctorId, patientId) {
    return {
        patientId,
        doctorId,
        visitDate: c.fecha,               // fecha real de la consulta
        visitType: c.motivo || null,      // "CONTROL GINECOLOGICO", "disuria", ...
        symptoms: c.motivo || null,
        diagnosis: c.diagnostico || null,
        treatment: c.tratamiento || null,
        labOrders: c.examenes || null,
        privateNotes: notasSignosVitales(c),
        legacyRecordId: c.legacyRecordId,
    };
}

/** Si no se pasa doctorId y hay un solo doctor, se usa ese. */
async function resolverDoctor(models, doctorId) {
    if (doctorId) return doctorId;
    const doctores = await models.Doctor.findAll({ attributes: ['id'], raw: true });
    if (doctores.length !== 1) {
        throw new Error(`hay ${doctores.length} doctores: indicá el doctorId explícitamente`);
    }
    console.log(`Doctor resuelto automáticamente: ${doctores[0].id}`);
    return doctores[0].id;
}

async function main() {
    const args = process.argv.slice(2);
    const purgar = args.includes('--purgar');
    const [jsonPath, doctorArg] = args.filter((a) => !a.startsWith('--'));

    if (!jsonPath) {
        console.error('Uso: node scripts/import-legacy-clinical-records.js <ruta-json> [doctorId] [--purgar]');
        process.exit(1);
    }

    const consultas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Consultas en el archivo: ${consultas.length}`);

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const doctorId = await resolverDoctor(models, doctorArg);

    const pacientes = await models.Patient.findAll({
        attributes: ['id', 'legacyRecordId'],
        where: { legacyRecordId: { [Sequelize.Op.not]: null } },
        raw: true,
    });
    const legacyAId = new Map(pacientes.map((p) => [p.legacyRecordId, p.id]));
    console.log(`Pacientes con legacy_record_id en BD: ${legacyAId.size}`);

    const filas = [];
    let sinPaciente = 0;
    for (const c of consultas) {
        const patientId = legacyAId.get(c.legacyPatientId);
        if (!patientId) { sinPaciente++; continue; }
        filas.push(construirFila(c, doctorId, patientId));
    }
    console.log(`Consultas sin paciente resuelto (omitidas): ${sinPaciente}`);
    console.log(`A insertar: ${filas.length}`);

    await sequelize.transaction(async (t) => {
        if (purgar) {
            const borradas = await models.ClinicalRecord.destroy({
                where: { doctorId, legacyRecordId: { [Sequelize.Op.not]: null } },
                transaction: t,
            });
            console.log(`Consultas heredadas borradas: ${borradas}`);
        }

        for (let i = 0; i < filas.length; i += LOTE) {
            await models.ClinicalRecord.bulkCreate(filas.slice(i, i + LOTE), { validate: true, transaction: t });
        }
    });

    const total = await models.ClinicalRecord.count({ where: { doctorId } });
    const conFecha = await models.ClinicalRecord.count({
        where: { doctorId, visitDate: { [Sequelize.Op.not]: null } },
    });
    console.log(`\nConsultas del doctor en BD: ${total}   con visit_date: ${conFecha}`);

    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
