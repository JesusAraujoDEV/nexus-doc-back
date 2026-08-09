/**
 * Importa F.U.M./F.P.P./gesta real desde EMBARAZO.DAT (VRunner) sobre las
 * fichas ya creadas por 20260810140000-fix-pregnancy-backfill-with-embarazos-code.
 *
 * Entrada: data/output/embarazo_2021_v2.json, generado por
 * data/scripts/analisis/22_extraer_embarazo.js. Cada fila trae `codigo` (el
 * mismo valor que quedó guardado en clinical_records.ultrasound_findings ->>
 * 'EMBARAZOS') y `pacienteLegacyCode` (-> patients.legacy_record_id). Ambos
 * deben coincidir para actualizar una ficha: así se evita cualquier colisión
 * con códigos de la era CONSULTA_2019, que reutiliza el mismo rango numérico.
 *
 * No toca fichas que el médico ya haya editado a mano (mismo guard que la
 * migración de corrección: solo actualiza si updated_at = created_at y
 * lmp_date/newborn_data siguen en null).
 *
 * Uso: DB_URL=... node scripts/import-legacy-pregnancies.js <ruta-json>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');
const { buildNewbornData, buildPregnancyUpdate } = require('./legacy-pregnancy-helpers');

async function main() {
    const [, , jsonPath] = process.argv;
    if (!jsonPath) {
        console.error('Uso: node scripts/import-legacy-pregnancies.js <ruta-json>');
        process.exit(1);
    }

    const filas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);

    const stats = { actualizadas: 0, pacienteNoEncontrado: 0, sinFicha: 0, variasFichas: 0, yaEditada: 0 };

    await sequelize.transaction(async (transaction) => {
        for (const fila of filas) {
            const [patient] = await sequelize.query(
                `SELECT id FROM patients WHERE legacy_record_id = $1`,
                { bind: [fila.pacienteLegacyCode], transaction },
            );
            if (!patient.length) { stats.pacienteNoEncontrado++; continue; }
            const patientId = patient[0].id;

            const [matches] = await sequelize.query(
                `SELECT DISTINCT pregnancy_id FROM clinical_records
                 WHERE patient_id = $1 AND ultrasound_findings->>'EMBARAZOS' = $2 AND pregnancy_id IS NOT NULL`,
                { bind: [patientId, String(fila.codigo)], transaction },
            );
            if (matches.length === 0) { stats.sinFicha++; continue; }
            if (matches.length > 1) { stats.variasFichas++; continue; }
            const pregnancyId = matches[0].pregnancy_id;

            const [[pregnancy]] = await sequelize.query(
                `SELECT updated_at, created_at, lmp_date, newborn_data FROM pregnancies WHERE id = $1`,
                { bind: [pregnancyId], transaction },
            );
            const untouched = pregnancy && pregnancy.updated_at.getTime() === pregnancy.created_at.getTime()
                && pregnancy.lmp_date === null && pregnancy.newborn_data === null;
            if (!untouched) { stats.yaEditada++; continue; }

            const newbornData = buildNewbornData(fila);
            const update = buildPregnancyUpdate(fila, newbornData);
            await sequelize.query(
                `
                UPDATE pregnancies SET
                  lmp_date = $1, lmp_source = $2, lmp_reference_date = $3,
                  lmp_reference_weeks = $4, lmp_reference_days = $5, fetal_sex = $6,
                  is_finalized = $7, is_loss = $8, is_ectopic = $9, newborn_data = $10,
                  pregnancy_number = $11, legacy_code = $12, notes = $13, updated_at = now()
                WHERE id = $14
                `,
                { bind: [...update, pregnancyId], transaction },
            );
            stats.actualizadas++;
        }
    });

    console.log('Resultado:', stats);
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
