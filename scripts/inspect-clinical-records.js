/**
 * Diagnóstico de solo lectura de clinical_records: cuántas filas hay, cómo
 * están repartidas por paciente y qué contenido traen. Sirve para comparar el
 * antes y el después de una recarga.
 *
 * Uso: DB_URL=... node scripts/inspect-clinical-records.js
 */
const { Sequelize } = require('sequelize');

async function main() {
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    const q = async (sql) => (await sequelize.query(sql, { type: Sequelize.QueryTypes.SELECT }));

    const [tot] = await q(`
        SELECT COUNT(*)::int AS filas,
               COUNT(DISTINCT patient_id)::int AS pacientes,
               COUNT(visit_date)::int AS con_visit_date,
               COUNT(treatment)::int AS con_tratamiento,
               COUNT(lab_orders)::int AS con_examenes,
               COUNT(diagnosis)::int AS con_diagnostico,
               MIN(created_at)::date AS created_min,
               MAX(created_at)::date AS created_max
        FROM clinical_records
    `).catch(async (e) => {
        // las columnas nuevas pueden no existir todavía
        if (!/visit_date|lab_orders/.test(e.message)) throw e;
        return q(`
            SELECT COUNT(*)::int AS filas,
                   COUNT(DISTINCT patient_id)::int AS pacientes,
                   NULL AS con_visit_date, COUNT(treatment)::int AS con_tratamiento,
                   NULL AS con_examenes, COUNT(diagnosis)::int AS con_diagnostico,
                   MIN(created_at)::date AS created_min, MAX(created_at)::date AS created_max
            FROM clinical_records
        `);
    });

    console.log('=== clinical_records ===');
    for (const [k, v] of Object.entries(tot)) console.log(`  ${k.padEnd(16)} ${v}`);

    const [pac] = await q('SELECT COUNT(*)::int AS n FROM patients');
    console.log(`  pacientes en BD  ${pac.n}`);

    const top = await q(`
        SELECT p.first_name || ' ' || p.last_name AS paciente, COUNT(*)::int AS consultas
        FROM clinical_records cr JOIN patients p ON p.id = cr.patient_id
        GROUP BY 1 ORDER BY 2 DESC LIMIT 5
    `);
    console.log('\n  pacientes con más consultas:');
    for (const r of top) console.log(`    ${String(r.consultas).padStart(4)}  ${r.paciente}`);

    const lili = await q(`
        SELECT cr.visit_date, cr.created_at::date AS created, cr.visit_type,
               LEFT(COALESCE(cr.treatment, ''), 60) AS tratamiento,
               COALESCE(cr.lab_orders, '') AS examenes
        FROM clinical_records cr JOIN patients p ON p.id = cr.patient_id
        WHERE p.legacy_record_id = 1
        ORDER BY COALESCE(cr.visit_date, cr.created_at::date)
    `).catch(() => []);
    console.log(`\n  consultas del paciente legacy #1 (Liliana Rivas): ${lili.length}`);
    for (const r of lili) {
        console.log(`    ${r.visit_date || '(sin fecha)'} | created=${r.created} | ${(r.visit_type || '').padEnd(22)} | ${r.tratamiento}${r.examenes ? ` | exám: ${r.examenes}` : ''}`);
    }

    await sequelize.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
