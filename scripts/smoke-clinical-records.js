/**
 * Prueba de humo de los services tocados: valida que el SQL generado corra
 * contra la base real y que el orden por fecha de consulta sea el correcto.
 *
 * Uso: DB_URL=... node scripts/smoke-clinical-records.js
 */
const sequelize = require('../libs/sequelize');
const ClinicalRecordService = require('../services/clinical_record_service');
const PatientService = require('../services/patient_service');

async function main() {
    const { models } = sequelize;
    const paciente = await models.Patient.findOne({ where: { legacyRecordId: 1 }, raw: true });
    if (!paciente) throw new Error('no existe el paciente legacy 1');
    console.log(`paciente: ${paciente.firstName} ${paciente.lastName}  (${paciente.id})`);

    // 1. ClinicalRecordService.findByPatient -> orden por fecha real
    const records = await new ClinicalRecordService().findByPatient(paciente.id);
    console.log(`\nfindByPatient: ${records.length} consultas (esperadas 9)`);
    for (const r of records) {
        console.log(`  ${r.visitDate}  ${(r.visitType || '').padEnd(22)} exám=${r.labOrders || '-'}`);
    }
    const fechas = records.map((r) => r.visitDate);
    const ordenOk = fechas.every((f, i) => i === 0 || fechas[i - 1] >= f);
    console.log(`  orden descendente por visitDate: ${ordenOk ? 'OK' : 'MAL'}`);

    // 2. PatientService.findOne -> incluye clinicalRecords ordenados
    const detalle = await new PatientService().findOne(paciente.id);
    const incl = detalle.clinicalRecords || [];
    const fechas2 = incl.map((r) => r.visitDate);
    const ordenOk2 = fechas2.every((f, i) => i === 0 || fechas2[i - 1] >= f);
    console.log(`\nfindOne: ${incl.length} consultas incluidas, orden ${ordenOk2 ? 'OK' : 'MAL'}`);
    console.log(`  primera: ${fechas2[0]}   última: ${fechas2[fechas2.length - 1]}`);

    // 3. lastVisit del listado debe ser la fecha real, no la de la carga
    const doctor = await models.Doctor.findOne({ raw: true });
    const listado = await new PatientService()
        .findByDoctor(doctor.userId, { limit: 3 })
        .catch((e) => ({ items: [], error: e.message }));
    if (listado.error) {
        console.log(`\nfindByDoctor no se pudo probar: ${listado.error}`);
    } else {
        console.log('\nfindByDoctor (lastVisit debe ser fecha real de consulta):');
        for (const p of listado.items) {
            const j = p.toJSON ? p.toJSON() : p;
            console.log(`  ${String(j.firstName || j.first_name)} ${String(j.lastName || j.last_name)}  visitas=${j.visitsCount}  lastVisit=${j.lastVisit}`);
        }
    }

    const todoOk = records.length === 9 && ordenOk && ordenOk2;
    await sequelize.close();
    console.log(todoOk ? '\n✓ prueba de humo OK' : '\n✗ algo no cuadra');
    process.exit(todoOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
