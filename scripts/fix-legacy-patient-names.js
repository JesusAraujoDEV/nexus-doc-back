/**
 * Rellena los nombres de pacientes que quedaron como "Sin nombre" en la
 * importación original.
 *
 * Esa importación tomó los nombres del reporte impreso a XPS, que no los traía
 * todos y además dejó escapes HTML (&apos;). Ahora los nombres se leen directo
 * del binario, así que se pueden completar.
 *
 * Solo toca filas cuyo nombre actual está vacío o es "Sin nombre", y arregla
 * los escapes HTML. No sobrescribe nombres válidos.
 *
 * Uso: DB_URL=... node scripts/fix-legacy-patient-names.js <pacientes.json> [--aplicar]
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');

const VACIO = /^(sin nombre)?$/i;

function partirNombre(completo) {
    const partes = completo.trim().split(/\s+/);
    if (partes.length === 1) return { firstName: partes[0], lastName: '' };
    // dos primeras palabras como nombre cuando hay 3 o más, si no una y una
    const corte = partes.length >= 4 ? 2 : 1;
    return { firstName: partes.slice(0, corte).join(' '), lastName: partes.slice(corte).join(' ') };
}

const desescapar = (s) => s
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function main() {
    const jsonPath = process.argv[2];
    const aplicar = process.argv.includes('--aplicar');
    if (!jsonPath) {
        console.error('Uso: node scripts/fix-legacy-patient-names.js <pacientes.json> [--aplicar]');
        process.exit(1);
    }

    const binario = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const porId = new Map(binario.map((p) => [p.id, p.NOMBRE]));

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    const filas = await sequelize.query(
        `SELECT id, legacy_record_id AS legacy, first_name, last_name
         FROM patients WHERE legacy_record_id IS NOT NULL`,
        { type: Sequelize.QueryTypes.SELECT },
    );

    const cambios = [];
    for (const f of filas) {
        const enBinario = porId.get(f.legacy);
        if (!enBinario) continue;

        const actual = `${f.first_name || ''} ${f.last_name || ''}`.trim();
        const limpio = desescapar(actual);

        if (VACIO.test(actual)) {
            cambios.push({ id: f.id, legacy: f.legacy, de: actual || '(vacío)', ...partirNombre(enBinario) });
        } else if (limpio !== actual) {
            cambios.push({ id: f.id, legacy: f.legacy, de: actual, ...partirNombre(limpio) });
        }
    }

    console.log(`pacientes a corregir: ${cambios.length}`);
    for (const c of cambios) console.log(`  legacy ${String(c.legacy).padStart(4)}  "${c.de}" -> "${c.firstName} ${c.lastName}".trim()`);

    if (!aplicar) {
        console.log('\n(ensayo en seco — volvé a correr con --aplicar para escribir)');
    } else if (cambios.length) {
        await sequelize.transaction(async (t) => {
            for (const c of cambios) {
                await sequelize.query(
                    'UPDATE patients SET first_name = :f, last_name = :l, updated_at = NOW() WHERE id = :id',
                    { replacements: { f: c.firstName, l: c.lastName, id: c.id }, transaction: t },
                );
            }
        });
        console.log(`\nactualizados: ${cambios.length}`);
    }

    await sequelize.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
