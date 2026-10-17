/**
 * Rellena recipe_items / ultrasound_findings (y category = 'obstetrics' cuando
 * la eco es obstétrica) para las consultas de UN snapshot de la era 2021,
 * solo en filas que todavía no tienen ninguno de los dos datos.
 *
 * Pensado para cargas diferenciales: las consultas nuevas de un backup entran
 * por el snippet de COMO-DESCIFRAR-DATOS.md § 5.2 sin récipe ni eco; esto las
 * completa sin tocar ninguna fila ya enriquecida.
 *
 * Entrada (data/output/, generados por 18_consolidar_consultas.js y
 * 19_extraer_ecografia_recipe.js sobre la misma carpeta):
 *   consultas_corregidas_<sufijo>.json
 *   ecografias_<carpeta>.json
 *   recipe_items_<carpeta>.json
 *
 * Uso:
 *   DB_URL=... node scripts/backfill-recipe-ultrasound-snapshot.js <carpeta> <sufijo>          (dry-run)
 *   DB_URL=... node scripts/backfill-recipe-ultrasound-snapshot.js <carpeta> <sufijo> --apply
 * Ej: ... CONSULTA_2021_oct 2021oct --apply
 */
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const DATA_OUT = path.join(__dirname, '..', '..', 'data', 'output');
const OBSTETRIC_KEYS = ['EMBARAZOS', 'TRIMESTRE', 'DBP', 'EDAD-GEST-SEM', 'SAC-GES'];

function leer(nombre) {
  return JSON.parse(fs.readFileSync(path.join(DATA_OUT, nombre), 'utf8'));
}

function esObstetrica(eco) {
  if (!eco) return false;
  if (eco['POR-EMBARAZO'] === true || eco['POR-EMBARAZO'] === 'true') return true;
  return OBSTETRIC_KEYS.some((k) => Object.prototype.hasOwnProperty.call(eco, k));
}

function indexar(carpeta, sufijo) {
  const ecoPorLegacyId = new Map(leer(`ecografias_${carpeta}.json`).map((e) => [e.legacyRecordId, e.ecografia]));
  const recipeCrudo = new Map(leer(`recipe_items_${carpeta}.json`));
  const recipePorLegacyId = new Map();
  for (const c of leer(`consultas_corregidas_${sufijo}.json`)) {
    const items = recipeCrudo.get(`${c.legacyPatientId}-${c.nroConsulta}`);
    if (items && items.length) recipePorLegacyId.set(c.legacyRecordId, items);
  }
  return { ecoPorLegacyId, recipePorLegacyId };
}

async function main() {
  const [carpeta, sufijo] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const apply = process.argv.includes('--apply');
  if (!carpeta || !sufijo) {
    console.error('Uso: node scripts/backfill-recipe-ultrasound-snapshot.js <carpeta> <sufijo> [--apply]');
    process.exit(1);
  }

  const { ecoPorLegacyId, recipePorLegacyId } = indexar(carpeta, sufijo);
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });

  // Solo era 2021 (< 1.000.000) y solo filas sin ningún dato enriquecido.
  const [rows] = await s.query(
    `SELECT id, legacy_record_id FROM clinical_records
     WHERE legacy_record_id < 1000000 AND deleted_at IS NULL
       AND recipe_items IS NULL AND ultrasound_findings IS NULL`,
  );

  const plan = [];
  for (const r of rows) {
    const recipe = recipePorLegacyId.get(r.legacy_record_id) || null;
    const eco = ecoPorLegacyId.get(r.legacy_record_id) || null;
    if (recipe || eco) plan.push({ id: r.id, recipe, eco, obst: esObstetrica(eco) });
  }
  console.log(`Candidatas sin enriquecer: ${rows.length}. A actualizar: ${plan.length} ` +
    `(con récipe ${plan.filter((p) => p.recipe).length}, con eco ${plan.filter((p) => p.eco).length}, ` +
    `obstétricas ${plan.filter((p) => p.obst).length})`);

  if (!apply) {
    console.log('Dry-run. Nada escrito. Volver a correr con --apply.');
    await s.close();
    return;
  }

  await s.transaction(async (transaction) => {
    for (const p of plan) {
      await s.query(
        `UPDATE clinical_records SET recipe_items = $1::jsonb, ultrasound_findings = $2::jsonb,
           category = CASE WHEN $3::boolean THEN 'obstetrics' ELSE category END, updated_at = now()
         WHERE id = $4 AND recipe_items IS NULL AND ultrasound_findings IS NULL`,
        { bind: [p.recipe ? JSON.stringify(p.recipe) : null, p.eco ? JSON.stringify(p.eco) : null, p.obst, p.id], transaction },
      );
    }
  });
  console.log(`Aplicado: ${plan.length} filas.`);
  await s.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
