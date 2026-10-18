const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

// Archivos que arma data/sync-laptop/app/extract-all.js.
const REQUIRED_FILES = [
  'pacientes_decodificados.json', 'consultas_corregidas.json', 'ecografias_sync.json', 'recipe_items_sync.json',
  'proxima_cita.json', 'med_esp.json', 'cent_med.json', 'embarazo.json', 'informes.json', 'orden_ex.json',
  'idxs_x_c_sync.json', 'antecede_sync.json', 'paciente_extra_sync.json', 'consulta_extra_sync.json',
];
const STALE_MS = 2 * 60 * 60 * 1000;
const KEEP_RUN_DIRS = 5;
const BASE_DIR = process.env.LEGACY_SYNC_DIR || path.join(os.tmpdir(), 'nexusdoc-legacy-sync');
const RUNNER = path.join(__dirname, '..', 'scripts', 'legacy-sync-run.js');

function validate(bundle) {
  if (!bundle || bundle.version !== 1 || typeof bundle.files !== 'object') throw boom.badRequest('Paquete inválido');
  const missing = REQUIRED_FILES.filter((f) => !Array.isArray(bundle.files[f]));
  if (missing.length) throw boom.badRequest(`Faltan datos en el paquete: ${missing.join(', ')}`);
  // La era 2019 reusa la numeración de 2021: cargarla por acá mezclaría historias.
  if (/2019/.test(String(bundle.sourceFolder || ''))) throw boom.badRequest('Esa carpeta es la historia 2019; no se sincroniza automáticamente');
}

/** Corridas "running" huérfanas (el servidor se reinició a mitad) pasan a failed. */
async function expireStale() {
  await models.LegacySyncRun.update(
    { status: 'failed', message: 'La carga se interrumpió', finishedAt: new Date() },
    { where: { status: 'running', createdAt: { [Op.lt]: new Date(Date.now() - STALE_MS) } } },
  );
}

/** Deja solo las últimas carpetas de paquete (tienen datos clínicos). */
function pruneRunDirs() {
  const dirs = fs.readdirSync(BASE_DIR).map((d) => path.join(BASE_DIR, d))
    .filter((d) => fs.statSync(d).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  dirs.slice(KEEP_RUN_DIRS).forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
}

function writeBundle(dir, bundle) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const name of REQUIRED_FILES) fs.writeFileSync(path.join(dir, name), JSON.stringify(bundle.files[name]), { mode: 0o600 });
}

function launch(dir, runId) {
  const child = spawn(process.execPath, [RUNNER, dir, runId], { cwd: path.join(__dirname, '..'), env: process.env, stdio: 'ignore' });
  child.on('error', () => models.LegacySyncRun.update({ status: 'failed', message: 'No se pudo iniciar la carga' }, { where: { id: runId } }));
}

class LegacySyncService {
  async start(bundle) {
    validate(bundle);
    await expireStale();
    const running = await models.LegacySyncRun.count({ where: { status: 'running' } });
    if (running) throw boom.conflict('Ya hay una actualización en curso. Esperá a que termine.');

    const id = crypto.randomUUID();
    const source = { generatedAt: bundle.generatedAt, machine: bundle.machine, sourceFolder: bundle.sourceFolder };
    await models.LegacySyncRun.create({ id, status: 'running', source });
    fs.mkdirSync(BASE_DIR, { recursive: true, mode: 0o700 });
    const dir = path.join(BASE_DIR, id);
    writeBundle(dir, bundle);
    pruneRunDirs();
    launch(dir, id);
    return { id, status: 'running' };
  }

  async findOne(id) {
    const run = await models.LegacySyncRun.findByPk(id, { attributes: { exclude: ['log'] } });
    if (!run) throw boom.notFound('Actualización no encontrada');
    return run;
  }
}

module.exports = LegacySyncService;
