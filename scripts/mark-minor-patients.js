/**
 * Marca las pacientes menores de edad con el prefijo "H-" en la cédula,
 * indicando que la cédula registrada es de la madre (representante).
 *
 * En Venezuela la cédula se saca a los 9 años; la Dra. Arteaga registraba
 * a las menores sin cédula propia con la de la madre y un punto al final.
 * Ese punto se pierde en la codificación radix-40, así que la señal para
 * detectarlas es la fecha de nacimiento: si tenía menos de 9 años en su
 * primera consulta, seguro no tiene cédula propia. Se usa 12 como corte
 * conservador (nunca hay cédula propia antes de los 9, rara vez antes de 12).
 *
 * Uso: DB_URL=... node scripts/mark-minor-patients.js [--aplicar]
 */
require('dotenv').config();
const fs = require('fs');
const { Sequelize } = require('sequelize');

const CORTE_EDAD = 12;

async function main() {
    const aplicar = process.argv.includes('--aplicar');
    const consultas = JSON.parse(fs.readFileSync('../data/output/consultas_corregidas.json', 'utf8'));

    // primera consulta de cada paciente
    const primeraCons = new Map();
    for (const c of consultas) {
        if (!primeraCons.has(c.legacyPatientId) || c.fecha < primeraCons.get(c.legacyPatientId))
            primeraCons.set(c.legacyPatientId, c.fecha);
    }

    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });

    const pacientes = await sequelize.query(
        `SELECT id, legacy_record_id, cedula, first_name, last_name, birth_date
         FROM patients WHERE legacy_record_id IS NOT NULL AND birth_date IS NOT NULL`,
        { type: Sequelize.QueryTypes.SELECT },
    );

    const cambios = [];
    for (const p of pacientes) {
        if (!p.birth_date) continue;
        const nacDate = new Date(p.birth_date);
        const primera = primeraCons.get(p.legacy_record_id);
        if (!primera) continue;
        const [ay, am, ad] = primera.split('-').map(Number);
        const consDate = new Date(ay, am - 1, ad);
        const edad = (consDate - nacDate) / (365.25 * 24 * 60 * 60 * 1000);
        if (edad >= CORTE_EDAD) continue;

        const cedActual = p.cedula || '';
        if (cedActual.startsWith('H-')) continue; // ya marcada

        const soloDigitos = cedActual.replace(/[^0-9]/g, '');
        const nueva = soloDigitos ? `H-${soloDigitos}` : `H-SIN-CEDULA-${p.legacy_record_id}`;
        cambios.push({ id: p.id, legacy: p.legacy_record_id, nombre: `${p.first_name} ${p.last_name}`, edad: edad.toFixed(1), de: cedActual, a: nueva });
    }

    console.log(`Pacientes menores de ${CORTE_EDAD} en su primera consulta: ${cambios.length}`);
    for (const c of cambios) {
        console.log(`  #${String(c.legacy).padStart(4)} ${c.nombre.padEnd(32)} edad=${c.edad}  ${c.de || '(vacía)'} -> ${c.a}`);
    }

    if (!aplicar) {
        console.log('\n(ensayo en seco — correr con --aplicar para escribir)');
    } else if (cambios.length) {
        for (const c of cambios) {
            await sequelize.query(
                'UPDATE patients SET cedula = :ced, updated_at = NOW() WHERE id = :id',
                { replacements: { ced: c.a, id: c.id } },
            );
        }
        console.log(`\nActualizadas: ${cambios.length}`);
    }

    await sequelize.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
