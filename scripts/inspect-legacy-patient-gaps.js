/**
 * SOLO LECTURA. Mide qué parte de los datos de ficha de paciente ya está en
 * la base, para contrastar con data/output/paciente_extra_<era>.json:
 * claves de medical_background->antecedentesGinecoObs, blood_type, height_cm,
 * referred_by_detail y phone.
 *
 * Uso: node -r dotenv/config scripts/inspect-legacy-patient-gaps.js
 */
const { Sequelize } = require('sequelize');

const SQL = `
SELECT
  COUNT(*)::int                                                                         AS pacientes,
  COUNT(*) FILTER (WHERE legacy_record_id IS NOT NULL)::int                             AS con_legacy,
  COUNT(*) FILTER (WHERE medical_background->'antecedentesGinecoObs' ? 'gestas')::int   AS con_gestas,
  COUNT(*) FILTER (WHERE medical_background->'antecedentesGinecoObs' ? 'cesareas')::int AS con_cesareas,
  COUNT(*) FILTER (WHERE medical_background->'antecedentesGinecoObs' ? 'partos')::int   AS con_partos,
  COUNT(*) FILTER (WHERE medical_background->'antecedentesGinecoObs' ? 'abortos')::int  AS con_abortos,
  COUNT(*) FILTER (WHERE medical_background->'antecedentesGinecoObs' ? 'ectopicos')::int AS con_ectopicos,
  COUNT(*) FILTER (WHERE medical_background ? 'antecedentesPersonales')::int            AS con_ant_personales,
  COUNT(*) FILTER (WHERE blood_type IS NOT NULL)::int                                   AS con_blood_type,
  COUNT(*) FILTER (WHERE height_cm IS NOT NULL)::int                                    AS con_height,
  COUNT(*) FILTER (WHERE referred_by_detail IS NOT NULL)::int                           AS con_referred_detail,
  COUNT(*) FILTER (WHERE phone IS NOT NULL)::int                                        AS con_phone
FROM patients WHERE deleted_at IS NULL`;

/** Compara NUM-PAR/NUM-ABO/NUM-EMB-ECT del extractor 34 contra medical_background. */
async function compararGineco(s, ruta) {
    const filas = JSON.parse(require('fs').readFileSync(ruta, 'utf8'));
    const [pats] = await s.query(`SELECT legacy_record_id, cedula, medical_background->'antecedentesGinecoObs' AS g FROM patients WHERE deleted_at IS NULL`);
    const porLegacy = new Map(pats.filter((p) => p.legacy_record_id != null).map((p) => [p.legacy_record_id, p]));
    const porCedula = new Map(pats.filter((p) => p.cedula).map((p) => [p.cedula.replace(/\D/g, ''), p]));
    const st = { conPar: 0, parFaltaEnBd: 0, parDistinto: 0, conAbo: 0, aboFaltaEnBd: 0, conEct: 0, sinPaciente: 0 };
    for (const f of filas) {
        const p = f.era === '2019' ? (f.cedula && porCedula.get(f.cedula)) || porLegacy.get(f.patientLegacyRecordId) : porLegacy.get(f.legacyPatientCode);
        if (!p) { st.sinPaciente++; continue; }
        const g = p.g || {};
        if (f['NUM-PAR']) { st.conPar++; if (g.partos === undefined) st.parFaltaEnBd++; else if (Number(g.partos) !== f['NUM-PAR']) st.parDistinto++; }
        if (f['NUM-ABO']) { st.conAbo++; if (g.abortos === undefined) st.aboFaltaEnBd++; }
        if (f['NUM-EMB-ECT']) st.conEct++;
    }
    console.log(ruta, st);
}

async function main() {
    const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    const [[fila]] = await s.query(SQL);
    console.log(fila);
    const [claves] = await s.query(`SELECT k, COUNT(*)::int n FROM patients, jsonb_object_keys(COALESCE(medical_background,'{}'::jsonb)) k WHERE deleted_at IS NULL GROUP BY k ORDER BY n DESC`);
    console.log('claves medical_background:', claves);
    const [rangos] = await s.query(`
      SELECT CASE WHEN legacy_record_id >= 100000 THEN '2019 (>=100000)' ELSE '2021 (<100000)' END AS rango,
             COUNT(*)::int n,
             COUNT(*) FILTER (WHERE medical_background->'antecedentesGinecoObs' ? 'partos')::int con_partos
      FROM patients WHERE deleted_at IS NULL AND legacy_record_id IS NOT NULL GROUP BY 1`);
    console.log('partos por rango legacy:', rangos);
    for (const ruta of process.argv.slice(2)) await compararGineco(s, ruta);
    await s.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
