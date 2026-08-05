/**
 * Verifica que patients.legacy_record_id apunte al paciente correcto,
 * comparando contra la extracción del binario de VRunner.
 *
 * Es un prerrequisito de la importación de consultas: si este mapeo estuviera
 * mal, las consultas quedarían atadas al paciente equivocado aunque el vínculo
 * consulta->paciente del legacy sea correcto.
 *
 * Uso: DB_URL=... node scripts/verify-legacy-patient-mapping.js <pacientes.json>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');

const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

async function main() {
    const jsonPath = process.argv[2] || '../data/output/pacientes_decodificados.json';
    const binario = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const porId = new Map(binario.map((p) => [p.id, p]));

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    const filas = await sequelize.query(
        `SELECT legacy_record_id AS legacy, first_name, last_name, cedula
         FROM patients WHERE legacy_record_id IS NOT NULL ORDER BY legacy_record_id`,
        { type: Sequelize.QueryTypes.SELECT },
    );

    let nombreOk = 0, cedulaOk = 0, conCedula = 0;
    const fallos = [];
    for (const f of filas) {
        const b = porId.get(f.legacy);
        if (!b) { fallos.push(`legacy ${f.legacy}: no existe en el binario`); continue; }

        const enBD = norm(`${f.first_name} ${f.last_name}`);
        const enBin = norm(b.NOMBRE);
        if (enBD === enBin) nombreOk++;
        else if (fallos.length < 10) fallos.push(`legacy ${f.legacy}: BD="${enBD}" binario="${enBin}"`);

        if (b.CEDULA) {
            conCedula++;
            if (String(f.cedula || '') === String(b.CEDULA)) cedulaOk++;
        }
    }

    console.log(`pacientes con legacy_record_id en BD : ${filas.length}`);
    console.log(`nombre coincide con el binario       : ${nombreOk} (${(nombreOk / filas.length * 100).toFixed(1)}%)`);
    console.log(`cédula coincide                      : ${cedulaOk} / ${conCedula} con cédula en el binario`);
    if (fallos.length) {
        console.log('\nprimeras discrepancias:');
        for (const f of fallos) console.log(`  ${f}`);
    }

    const [lili] = await sequelize.query(
        `SELECT legacy_record_id, first_name, last_name, cedula, birth_date FROM patients WHERE legacy_record_id = 1`,
        { type: Sequelize.QueryTypes.SELECT },
    );
    console.log('\nlegacy_record_id = 1 en BD:', JSON.stringify(lili));
    console.log('legacy id 1 en el binario:', JSON.stringify({ nombre: porId.get(1)?.NOMBRE, cedula: porId.get(1)?.CEDULA, nac: porId.get(1)?.['FECH-NAC'] }));

    await sequelize.close();
    process.exit(nombreOk / filas.length > 0.95 ? 0 : 1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
