/**
 * Inserta las consultas de un backup 2021 que todavía no están en la base
 * (por legacy_record_id). Es el snippet de COMO-DESCIFRAR-DATOS.md § 5.2
 * convertido en script. Nunca borra ni modifica consultas existentes.
 *
 * Uso: node -r dotenv/config scripts/import-legacy-new-records.js <consultas_corregidas.json> [--apply]
 */
const fs = require('fs');
const { Sequelize, Op } = require('sequelize');
const { setupModels } = require('../db/models');
const { buildRecordRow } = require('./legacy-import-helpers');

async function main() {
  const [jsonPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const apply = process.argv.includes('--apply');
  if (!jsonPath) {
    console.error('Uso: node scripts/import-legacy-new-records.js <consultas.json> [--apply]');
    process.exit(1);
  }

  const consultas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);
  const { models } = sequelize;

  const doctores = await models.Doctor.findAll({ attributes: ['id'], raw: true });
  if (doctores.length !== 1) throw new Error(`hay ${doctores.length} doctores: este script asume uno solo`);
  const doctorId = doctores[0].id;

  const existentes = await models.ClinicalRecord.findAll({
    attributes: ['legacyRecordId'],
    where: { doctorId, legacyRecordId: { [Op.not]: null } },
    paranoid: false,
    raw: true,
  });
  const yaCargadas = new Set(existentes.map((r) => r.legacyRecordId));
  // Era 2021: el paciente se resuelve por legacy_record_id < 100000.
  const pacientes = await models.Patient.findAll({
    attributes: ['id', 'legacyRecordId'],
    where: { legacyRecordId: { [Op.lt]: 100000 } },
    paranoid: false,
    raw: true,
  });
  const pacientePorLegacy = new Map(pacientes.map((p) => [p.legacyRecordId, p.id]));

  const nuevas = consultas.filter((c) => !yaCargadas.has(c.legacyRecordId));
  const filas = nuevas
    .filter((c) => pacientePorLegacy.has(c.legacyPatientId))
    .map((c) => buildRecordRow(c, doctorId, pacientePorLegacy.get(c.legacyPatientId)));
  console.log(`Consultas nuevas: ${nuevas.length} | con paciente resuelto: ${filas.length} | sin paciente: ${nuevas.length - filas.length}`);

  if (!apply) {
    console.log('Dry-run. Nada escrito.');
    await sequelize.close();
    return;
  }
  const r = await models.ClinicalRecord.bulkCreate(filas, { validate: true });
  console.log(`Aplicado: ${r.length} consultas insertadas.`);
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
