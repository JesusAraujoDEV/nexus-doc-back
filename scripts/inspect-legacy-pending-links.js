/**
 * SOLO LECTURA. Verifica que las claves de vínculo que emiten los extractores
 * data/scripts/analisis/32..35 encuentran su paciente/consulta en la base.
 *
 * Por cada JSON (con era 2021_* o 2019):
 *   consulta: clinical_records.legacy_record_id = recordLegacyRecordId y
 *             misma visit_date (si la fecha difiere, la fila del .DAT no es la
 *             misma consulta que se cargó: el índice de fila no es estable)
 *             + alternativa (paciente, visit_date) como usan los imports de informes.
 *   paciente: 2021 -> patients.legacy_record_id = legacyPatientCode
 *             2019 -> cédula; si no, legacy_record_id = 100000 + código
 *
 * Uso: node -r dotenv/config scripts/inspect-legacy-pending-links.js <json> [...]
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');

function resolverPaciente(f, porLegacy, porCedula) {
    if (f.era !== '2019') return porLegacy.get(f.legacyPatientCode) || null;
    return (f.cedula && porCedula.get(f.cedula)) || porLegacy.get(f.patientLegacyRecordId) || null;
}

function evaluar(filas, ctx) {
    const st = { filas: filas.length, pacienteOk: 0, conConsulta: 0, consultaPorIdOk: 0, consultaPorIdFechaDistinta: 0, consultaPorIdNoExiste: 0, consultaPorFechaUnica: 0, consultaPorFechaAmbigua: 0 };
    for (const f of filas) {
        const pid = resolverPaciente(f, ctx.porLegacy, ctx.porCedula);
        if (pid) st.pacienteOk++;
        if (f.nroConsulta === undefined) continue;
        st.conConsulta++;
        const rec = ctx.recPorLegacy.get(f.recordLegacyRecordId);
        if (!rec) st.consultaPorIdNoExiste++;
        else if (rec.visit_date === f.visitDate && rec.patient_id === pid) st.consultaPorIdOk++;
        else st.consultaPorIdFechaDistinta++;
        const cands = pid ? ctx.recPorPacFecha.get(`${pid}|${f.visitDate}`) || [] : [];
        if (cands.length === 1) st.consultaPorFechaUnica++;
        else if (cands.length > 1) st.consultaPorFechaAmbigua++;
    }
    return st;
}

async function main() {
    const rutas = process.argv.slice(2);
    if (!rutas.length) { console.error('Uso: node -r dotenv/config scripts/inspect-legacy-pending-links.js <json> [...]'); process.exit(1); }
    const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    const [pats] = await s.query('SELECT id, legacy_record_id, cedula FROM patients WHERE deleted_at IS NULL');
    const [recs] = await s.query('SELECT id, patient_id, legacy_record_id, visit_date FROM clinical_records WHERE deleted_at IS NULL');
    const ctx = {
        porLegacy: new Map(pats.filter((p) => p.legacy_record_id != null).map((p) => [p.legacy_record_id, p.id])),
        porCedula: new Map(pats.filter((p) => p.cedula).map((p) => [p.cedula.replace(/\D/g, ''), p.id])),
        recPorLegacy: new Map(recs.filter((r) => r.legacy_record_id != null).map((r) => [r.legacy_record_id, r])),
        recPorPacFecha: new Map(),
    };
    for (const r of recs) {
        const k = `${r.patient_id}|${r.visit_date}`;
        if (!ctx.recPorPacFecha.has(k)) ctx.recPorPacFecha.set(k, []);
        ctx.recPorPacFecha.get(k).push(r.id);
    }
    console.log(`BD: patients=${pats.length} clinical_records=${recs.length}`);
    for (const ruta of rutas) {
        const filas = JSON.parse(fs.readFileSync(ruta, 'utf8'));
        console.log(ruta, evaluar(filas, ctx));
    }
    await s.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
