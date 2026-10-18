/**
 * Carga un paquete de la laptop de la doctora (POST /api/legacy-sync) en
 * producción, encadenando los scripts de carga diferencial en el orden de
 * data/docs/COMO-DESCIFRAR-DATOS.md § 5. Lo lanza legacy_sync_service; se
 * puede correr a mano para reintentar:
 *
 *   node -r dotenv/config scripts/legacy-sync-run.js <carpeta-paquete> <runId>
 *
 * Todos los pasos son idempotentes (solo insertan lo que falta o rellenan lo
 * vacío). Antes de escribir: frenos (legacy-sync-guard.js) y respaldo JSON.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const sequelize = require('../libs/sequelize');

const ROOT = path.join(__dirname, '..');
const GUARD_REVIEW = 3;

function steps(dir, doctorId, runId) {
  const f = (name) => path.join(dir, name);
  return [
    ['Respaldo', 'backup-legacy-tables.js', [`sync-${runId}`]],
    ['Pacientes nuevas', 'import-legacy-patients.js', [f('pacientes_decodificados.json'), doctorId, '--apply']],
    ['Nombres', 'fix-legacy-patient-names.js', [f('pacientes_decodificados.json'), '--aplicar']],
    ['Cédula y teléfono', 'fill-legacy-patient-contact.js', ['--apply']],
    ['Consultas nuevas', 'import-legacy-new-records.js', [f('consultas_corregidas.json'), '--apply']],
    ['Médicos referentes', 'import-legacy-referring-doctors.js', [f('med_esp.json')]],
    ['Récipes y ecografías', 'backfill-recipe-ultrasound-snapshot.js', ['sync', 'sync', '--apply']],
    ['Próximas citas', 'import-legacy-next-appointment-2021.js', [f('proxima_cita.json')]],
    ['Informes', 'import-legacy-medical-reports-2021.js', [f('informes.json'), f('med_esp.json'), f('cent_med.json'), '--apply']],
    ['Órdenes de examen', 'import-legacy-lab-exam-orders-2021.js', [f('orden_ex.json'), '--apply']],
    ['Fichas de embarazo', 'link-new-obstetric-records.js', ['--apply']],
    ['Datos de embarazo', 'import-legacy-pregnancies.js', [f('embarazo.json')]],
    ['Campos extra', 'import-legacy-extras.js', ['--apply']],
  ];
}

function runScript(script, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['-r', 'dotenv/config', '--max-old-space-size=4096', path.join(__dirname, script), ...args], { cwd: ROOT, env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}

/** Línea que resume el paso ("Aplicado: 3 ...", "Preparadas 0 ..."), o la última. */
function lastLine(text) {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter((l) => l && !/DeprecationWarning|trace-deprecation/.test(l));
  const key = lines.filter((l) => /aplicad|preparad|importad|insertad|nuevos importados|a corregir/i.test(l)).pop();
  return key || lines.pop() || '';
}

async function finish(run, status, fields) {
  await run.update({ status, finishedAt: new Date(), ...fields });
  await sequelize.close();
}

async function main() {
  const [dir, runId] = process.argv.slice(2);
  const { models } = sequelize;
  const run = await models.LegacySyncRun.findByPk(runId);
  if (!run) throw new Error(`no existe la corrida ${runId}`);
  const env = { ...process.env, LEGACY_DATA_DIR: dir, LEGACY_EXTRAS_ERAS: 'sync', LEGACY_BACKUP_DIR: path.join(dir, '..') };
  fs.copyFileSync(path.join(dir, 'consultas_corregidas.json'), path.join(dir, 'consultas_corregidas_sync.json'));

  let log = '';
  const guard = await runScript('legacy-sync-guard.js', [dir], env);
  log += `### Frenos\n${guard.out}\n`;
  const guardLine = guard.out.split('\n').find((l) => l.startsWith('GUARD '));
  const plan = guardLine ? JSON.parse(guardLine.slice(6)) : {};
  if (guard.code === GUARD_REVIEW) return finish(run, 'needs_review', { summary: { plan }, message: plan.reason, log });
  if (guard.code !== 0) return finish(run, 'failed', { summary: { plan }, message: 'No se pudieron revisar los datos', log });

  const doctor = await models.Doctor.findOne({ attributes: ['id'] });
  const results = [];
  for (const [label, script, args] of steps(dir, doctor.id, runId)) {
    const r = await runScript(script, args, env);
    log += `\n### ${label} (${script}) -> ${r.code}\n${r.out}\n`;
    results.push({ step: label, ok: r.code === 0, result: lastLine(r.out) });
    if (r.code !== 0) {
      return finish(run, 'failed', { summary: { plan, results }, message: `Falló el paso "${label}"`, log });
    }
  }
  const integrity = await runScript('check-legacy-integrity.js', [], env);
  log += `\n### Integridad\n${integrity.out}\n`;
  const message = `${plan.newPatients} pacientes nuevas y ${plan.newRecords} consultas nuevas.`;
  return finish(run, 'done', { summary: { plan, results, integrity: integrity.out.trim().split('\n') }, message, log });
}

main().catch(async (e) => {
  console.error(e);
  try {
    const run = await sequelize.models.LegacySyncRun.findByPk(process.argv[3]);
    if (run) await finish(run, 'failed', { message: e.message });
  } catch { /* la base no responde: el servicio marca la corrida vieja como fallida */ }
  process.exit(1);
});
