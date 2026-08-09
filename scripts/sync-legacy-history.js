/**
 * Sincroniza dos snapshots nuevos de MedDig/VRunner contra producción:
 *
 *   - data/output/pacientes_decodificados_2021v2.json + consultas_corregidas_2021v2.json
 *     Continuación de la misma numeración ya migrada (CONSULTA_2021): trae
 *     pacientes y consultas nuevas desde ago-2026.
 *
 *   - data/output/pacientes_decodificados_2019.json + consultas_corregidas_2019.json
 *     Historia 2013-2019, numeración de paciente INDEPENDIENTE (su id=1 es un
 *     paciente de prueba, nada que ver con el id=1 de 2021). Se resuelve por
 *     cédula: si la cédula ya existe en producción (o en los nuevos de v2), la
 *     consulta se cuelga de ESE paciente; si no, se crea un paciente nuevo con
 *     legacy_record_id = 100000 + id-original-2019 (namespace separado para no
 *     chocar con la numeración de 2021, que nunca pasa de ~3000).
 *
 * Uso:
 *   DB_URL=... node scripts/sync-legacy-history.js            (dry-run, no escribe)
 *   DB_URL=... node scripts/sync-legacy-history.js --apply    (escribe)
 */
const fs = require('fs');
const path = require('path');
const { Sequelize, Op } = require('sequelize');
const { setupModels } = require('../db/models');
const { cedulasDuplicadas, cedulaUsable, buildPatientRow, buildRecordRow } = require('./legacy-import-helpers');

const DATA_OUT = path.join(__dirname, '..', '..', 'data', 'output');
const OFFSET_2019 = 100000;
// legacy_record_id de clinical_records tiene constraint único y cada snapshot reinicia su
// numeración en 1: v2 se queda con su rango original (1..~7372, igual que la carga actual
// en producción), 2019 se desplaza para no chocar.
const OFFSET_CONSULTAS_2019 = 1000000;
const LOTE = 500;

async function resolverDoctor(models) {
    const doctores = await models.Doctor.findAll({ attributes: ['id'], raw: true });
    if (doctores.length !== 1) throw new Error(`hay ${doctores.length} doctores: este script asume uno solo`);
    return doctores[0].id;
}

function leer(nombre) {
    return JSON.parse(fs.readFileSync(path.join(DATA_OUT, nombre), 'utf8'));
}

/** Pacientes de v2 cuyo id todavía no está en producción (misma numeración que la ya migrada). */
function planPacientesNuevosV2(pacientesV2, legacyMap, doctorId) {
    const dup = cedulasDuplicadas(pacientesV2);
    return pacientesV2
        .filter((p) => !legacyMap.has(p.id))
        .map((p) => buildPatientRow(p, doctorId, p.id, cedulaUsable(p, dup)));
}

/** Pacientes de 2019: por cada uno, o se fusiona por cédula con uno que ya existe, o se da de alta con namespace propio. */
function planPacientes2019(pacientes2019, cedulaMapProyectada, doctorId) {
    const dup = cedulasDuplicadas(pacientes2019);
    const cedulaOrigen = new Map(pacientes2019.map((p) => [p.id, cedulaUsable(p, dup)]));
    const nuevos = [];
    let fusionados = 0;
    for (const p of pacientes2019) {
        const ced = cedulaOrigen.get(p.id);
        if (ced && cedulaMapProyectada.has(ced)) { fusionados++; continue; }
        nuevos.push(buildPatientRow(p, doctorId, OFFSET_2019 + p.id, ced));
    }
    return { nuevos, fusionados, cedulaOrigen };
}

function resolverFilasV2(consultasV2, legacyMap, doctorId) {
    const filas = [];
    let sinPaciente = 0;
    for (const c of consultasV2) {
        const patientId = legacyMap.get(c.legacyPatientId);
        if (!patientId) { sinPaciente++; continue; }
        filas.push(buildRecordRow(c, doctorId, patientId));
    }
    return { filas, sinPaciente };
}

function resolverFilas2019(consultas2019, cedulaOrigen, cedulaMap, legacyMap, doctorId) {
    const filas = [];
    let sinPaciente = 0;
    for (const c of consultas2019) {
        const ced = cedulaOrigen.get(c.legacyPatientId);
        const patientId = (ced && cedulaMap.get(ced)) || legacyMap.get(OFFSET_2019 + c.legacyPatientId);
        if (!patientId) { sinPaciente++; continue; }
        filas.push(buildRecordRow(c, doctorId, patientId, OFFSET_CONSULTAS_2019));
    }
    return { filas, sinPaciente };
}

async function insertarEnLotes(model, filas, transaction) {
    const creadas = [];
    for (let i = 0; i < filas.length; i += LOTE) {
        creadas.push(...await model.bulkCreate(filas.slice(i, i + LOTE), { validate: true, transaction }));
    }
    return creadas;
}

async function main() {
    const apply = process.argv.includes('--apply');

    const pacientesV2 = leer('pacientes_decodificados_2021v2.json');
    const pacientes2019 = leer('pacientes_decodificados_2019.json');
    const consultasV2 = leer('consultas_corregidas_2021v2.json');
    const consultas2019 = leer('consultas_corregidas_2019.json');

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;
    const doctorId = await resolverDoctor(models);

    const existentes = await models.Patient.findAll({ attributes: ['id', 'cedula', 'legacyRecordId'], raw: true });
    const legacyMap = new Map(existentes.filter((p) => p.legacyRecordId != null).map((p) => [p.legacyRecordId, p.id]));
    const cedulaMap = new Map(existentes.filter((p) => p.cedula).map((p) => [p.cedula, p.id]));
    console.log(`Producción: ${existentes.length} pacientes (${legacyMap.size} con legacy_record_id, ${cedulaMap.size} con cédula)`);

    const nuevosV2 = planPacientesNuevosV2(pacientesV2, legacyMap, doctorId);
    console.log(`v2: ${nuevosV2.length} pacientes nuevos (de ${pacientesV2.length} totales)`);

    const cedulaMapProyectada = new Map(cedulaMap);
    for (const row of nuevosV2) if (row.cedula) cedulaMapProyectada.set(row.cedula, true);
    const { nuevos: nuevos2019, fusionados: fusionados2019, cedulaOrigen: cedulaOrigen2019 } = planPacientes2019(pacientes2019, cedulaMapProyectada, doctorId);
    console.log(`2019: ${fusionados2019} pacientes fusionados por cédula con uno ya existente, ${nuevos2019.length} pacientes nuevos (de ${pacientes2019.length} totales)`);

    if (!apply) {
        console.log('\nDry-run. Nada escrito. Volver a correr con --apply para aplicar.');
        await sequelize.close();
        return;
    }

    await sequelize.transaction(async (t) => {
        for (const creadas of [await insertarEnLotes(models.Patient, nuevosV2, t), await insertarEnLotes(models.Patient, nuevos2019, t)]) {
            for (const c of creadas) {
                legacyMap.set(c.legacyRecordId, c.id);
                if (c.cedula) cedulaMap.set(c.cedula, c.id);
            }
        }

        // force: true -> hard delete. Un soft delete dejaría las filas viejas ocupando los
        // mismos legacy_record_id (constraint único), chocando con la reinserción de abajo.
        const borradas = await models.ClinicalRecord.destroy({
            where: { doctorId, legacyRecordId: { [Op.not]: null } },
            force: true,
            transaction: t,
        });
        console.log(`Consultas heredadas borradas: ${borradas}`);

        const { filas: filasV2, sinPaciente: sinPacienteV2 } = resolverFilasV2(consultasV2, legacyMap, doctorId);
        const { filas: filas2019, sinPaciente: sinPaciente2019 } = resolverFilas2019(consultas2019, cedulaOrigen2019, cedulaMap, legacyMap, doctorId);
        console.log(`Consultas a insertar: v2=${filasV2.length}, 2019=${filas2019.length}, sin paciente resuelto (omitidas)=${sinPacienteV2 + sinPaciente2019}`);

        await insertarEnLotes(models.ClinicalRecord, filasV2, t);
        await insertarEnLotes(models.ClinicalRecord, filas2019, t);
    });

    const totalPacientes = await models.Patient.count();
    const totalConsultas = await models.ClinicalRecord.count({ where: { doctorId } });
    console.log(`\nProducción ahora: ${totalPacientes} pacientes, ${totalConsultas} consultas.`);
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
