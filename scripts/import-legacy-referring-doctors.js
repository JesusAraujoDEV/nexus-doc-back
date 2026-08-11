/**
 * Importa el catálogo de médicos referentes desde MED-ESP.DAT de ambas eras
 * legadas (data/scripts/analisis/27_extraer_med_esp.js). A diferencia de
 * medical_centers (mismo catálogo exacto en ambas eras), MED-ESP.DAT SÍ
 * reinicia su CODIGO entre eras (coincide en los primeros 7 registros por
 * casualidad, diverge desde el 8) - así que no se usa legacy_code para nada,
 * se mergea por nombre normalizado (trim + mayúsculas) para no duplicar al
 * mismo médico bajo dos códigos distintos.
 *
 * Uso: DB_URL=... node scripts/import-legacy-referring-doctors.js <archivo1.json> [archivo2.json ...]
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

function normaliza(nombre) {
  return nombre.trim().toUpperCase().replace(/\s+/g, ' ');
}

async function main() {
  const paths = process.argv.slice(2);
  if (!paths.length) {
    console.error('Uso: node scripts/import-legacy-referring-doctors.js <archivo1.json> [archivo2.json ...]');
    process.exit(1);
  }

  const porNombre = new Map(); // nombreNormalizado -> { nombre, especialidad }
  for (const p of paths) {
    const filas = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const fila of filas) {
      const clave = normaliza(fila.nombre);
      const existente = porNombre.get(clave);
      if (!existente) {
        porNombre.set(clave, { nombre: fila.nombre, especialidad: fila.especialidad });
      } else if (!existente.especialidad && fila.especialidad) {
        existente.especialidad = fila.especialidad; // completa especialidad si el primero no la tenia
      }
    }
  }

  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);
  const { models } = sequelize;

  const [existentes] = await sequelize.query(`SELECT name FROM referring_doctors`);
  const yaImportados = new Set(existentes.map((r) => normaliza(r.name)));

  const rows = [...porNombre.entries()]
    .filter(([clave]) => !yaImportados.has(clave))
    .map(([, v]) => ({ name: v.nombre, specialty: v.especialidad }));

  const result = await models.ReferringDoctor.bulkCreate(rows, { validate: true });
  console.log(`Médicos únicos en el legado: ${porNombre.size}. Nuevos importados: ${result.length}.`);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
