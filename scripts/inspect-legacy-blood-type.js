/**
 * SOLO LECTURA. Corrobora la traducción de GRUPO-SG / FACTOR-RH (códigos 1..4 /
 * 1..2 de una lista Velneo cuyo texto está en el .vam cifrado) buscando
 * menciones de grupo sanguíneo en el texto libre ya migrado de las consultas
 * y fichas de las pacientes que tienen el código cargado.
 *
 * Uso: node -r dotenv/config scripts/inspect-legacy-blood-type.js <paciente_extra_<era>.json> [...]
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');

const RE = /(GRUPO\s*(SANG\w*)?\s*:?\s*|TIPAJE\s*:?\s*|\b)(AB|A|B|O)\s*(RH)?\s*(\+|-|POSITIVO|NEGATIVO|POS\b|NEG\b)/i;

async function main() {
    const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    const [pats] = await s.query('SELECT id, legacy_record_id, cedula, medical_background::text AS mb FROM patients WHERE deleted_at IS NULL');
    const porLegacy = new Map(pats.filter((p) => p.legacy_record_id != null).map((p) => [p.legacy_record_id, p]));
    const porCedula = new Map(pats.filter((p) => p.cedula).map((p) => [p.cedula.replace(/\D/g, ''), p]));
    const [recs] = await s.query(`SELECT patient_id, concat_ws(' | ', symptoms, diagnosis, treatment, lab_orders, private_notes) AS t FROM clinical_records WHERE deleted_at IS NULL`);
    const textos = new Map();
    for (const r of recs) textos.set(r.patient_id, `${textos.get(r.patient_id) || ''} | ${r.t}`);

    for (const ruta of process.argv.slice(2)) {
        const filas = JSON.parse(fs.readFileSync(ruta, 'utf8')).filter((f) => f['GRUPO-SG'] || f['FACTOR-RH']);
        console.log(`== ${ruta}: ${filas.length} pacientes con código`);
        for (const f of filas) {
            const p = f.era === '2019' ? (f.cedula && porCedula.get(f.cedula)) || porLegacy.get(f.patientLegacyRecordId) : porLegacy.get(f.legacyPatientCode);
            if (!p) continue;
            const texto = `${p.mb || ''} | ${textos.get(p.id) || ''}`;
            const m = RE.exec(texto);
            if (!m || !/GRUPO|TIPAJE|RH|POSITIVO|NEGATIVO/i.test(m[0])) continue;
            console.log(`  G=${f['GRUPO-SG'] || '-'} RH=${f['FACTOR-RH'] || '-'}  "${texto.slice(Math.max(0, m.index - 20), m.index + 40).replace(/\s+/g, ' ')}"`);
        }
    }
    await s.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
