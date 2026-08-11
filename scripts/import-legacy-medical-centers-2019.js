/**
 * Completa medical_centers con los centros de CONSULTA_2019/CENT-MED.DAT
 * que no estaban ya importados. Se creía que este catálogo era idéntico
 * entre eras (la comparación inicial solo miró el dump más chico, 2021_v2,
 * 18 filas) - CONSULTA_2019 tiene 43 y diverge desde el código 13. Mismo
 * merge-por-nombre que referring_doctors.
 *
 * Uso: DB_URL=... node scripts/import-legacy-medical-centers-2019.js <archivo.json>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

function normaliza(nombre) {
  return nombre.trim().toUpperCase().replace(/\s+/g, ' ');
}

async function main() {
  const [, , jsonPath] = process.argv;
  if (!jsonPath) {
    console.error('Uso: node scripts/import-legacy-medical-centers-2019.js <archivo.json>');
    process.exit(1);
  }

  const filas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);
  const { models } = sequelize;

  const [existentes] = await sequelize.query(`SELECT name FROM medical_centers`);
  const yaImportados = new Set(existentes.map((r) => normaliza(r.name)));

  const vistos = new Set();
  const nuevos = [];
  for (const fila of filas) {
    const clave = normaliza(fila.nombre);
    if (yaImportados.has(clave) || vistos.has(clave)) continue;
    vistos.add(clave);
    nuevos.push({ name: fila.nombre, address: fila.direccion });
  }

  const result = await models.MedicalCenter.bulkCreate(nuevos, { validate: true });
  console.log(`Centros ya existentes: ${yaImportados.size}. Nuevos importados: ${result.length}.`);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
