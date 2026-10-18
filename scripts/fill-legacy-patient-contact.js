/**
 * Rellena cédula, teléfono, fecha de nacimiento, nº de historia, sexo y
 * dirección de pacientes legacy que quedaron sin esos datos (las 87 de la
 * carga del 2026-10-16 entraron por import-legacy-patients.js, que solo
 * grababa nombre y dirección).
 *
 * Solo rellena lo vacío (COALESCE). Cédula:
 *   - termina en "." en el legacy -> es la de la madre (convención de la
 *     doctora para menores) -> se guarda como "H-<dígitos>".
 *   - repetida en el archivo fuente o ya usada por otra paciente -> no se toca
 *     (patients.cedula es única) y se lista para revisión manual.
 *
 * Fuentes: data/output/pacientes_decodificados.json (era 2021, más reciente)
 * y pacientes_decodificados_2019.json (legacy_record_id = 100000 + id).
 *
 * Uso: node -r dotenv/config scripts/fill-legacy-patient-contact.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const sequelize = require('../libs/sequelize');

// LEGACY_DATA_DIR: carpeta de un paquete de sincronización (solo trae era 2021).
const OUT = process.env.LEGACY_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'output');
const SOURCES = [
  { file: 'pacientes_decodificados.json', offset: 0 },
  { file: 'pacientes_decodificados_2019.json', offset: 100000 },
].filter((s) => fs.existsSync(path.join(OUT, s.file)));
const apply = process.argv.includes('--apply');

const digits = (s) => String(s || '').replace(/\D/g, '');
const blank = (v) => v === null || v === undefined || String(v).trim() === '' || v === '1900-01-01';

function parseDDMMYYYY(s) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || '');
  if (!m || Number(m[3]) < 1900) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Cédula a guardar según la convención de la doctora, o null si no es usable. */
function cedulaFor(raw) {
  const d = digits(raw);
  if (!/^\d{6,9}$/.test(d)) return null;
  return String(raw).trim().endsWith('.') ? `H-${d}` : d;
}

function sourceDuplicates(rows) {
  const counts = new Map();
  for (const r of rows) {
    const c = cedulaFor(r.CEDULA);
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([c]) => c));
}

function planFor(patient, src, ctx) {
  const next = { id: patient.id };
  const fields = [];
  const ced = cedulaFor(src.CEDULA);
  if (blank(patient.cedula) && ced) {
    if (ctx.dupSource.has(ced) || ctx.taken.has(ced)) ctx.conflicts.push({ lid: patient.lid, nombre: patient.nombre, cedula: ced });
    else { next.cedula = ced; ctx.taken.add(ced); fields.push(ced.startsWith('H-') ? 'cedulaHija' : 'cedula'); }
  }
  const phone = digits(src.CELULAR);
  if (blank(patient.phone) && phone.length >= 7) { next.phone = phone; fields.push('phone'); }
  const birth = parseDDMMYYYY(src['FECH-NAC']);
  if (blank(patient.birth_date) && birth) { next.birth_date = birth; fields.push('birthDate'); }
  if (blank(patient.history_number) && src.HISTORIA) { next.history_number = String(src.HISTORIA).trim(); fields.push('historia'); }
  if (blank(patient.address) && src.DIRECCION) { next.address = String(src.DIRECCION).trim(); fields.push('address'); }
  const gender = src.SEXO === 'F' ? 'Femenino' : src.SEXO === 'M' ? 'Masculino' : null;
  if (blank(patient.gender) && gender) { next.gender = gender; fields.push('gender'); }
  return { next, fields };
}

const SQL = `UPDATE patients p SET
  cedula = COALESCE(p.cedula, v.cedula),
  phone = COALESCE(NULLIF(p.phone, ''), v.phone),
  birth_date = CASE WHEN p.birth_date IS NULL OR p.birth_date = '1900-01-01' THEN COALESCE(v.birth_date, p.birth_date) ELSE p.birth_date END,
  history_number = COALESCE(NULLIF(p.history_number, ''), v.history_number),
  address = COALESCE(NULLIF(p.address, ''), v.address),
  gender = COALESCE(p.gender, v.gender),
  updated_at = NOW()
FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS v(id uuid, cedula text, phone text, birth_date date, history_number text, address text, gender text)
WHERE p.id = v.id`;

async function main() {
  const q = (sql, opts = {}) => sequelize.query(sql, { type: 'SELECT', logging: false, ...opts });
  const patients = await q(`SELECT id, legacy_record_id AS lid, first_name || ' ' || last_name AS nombre,
      cedula, phone, birth_date, history_number, address, gender FROM patients WHERE legacy_record_id IS NOT NULL`);
  const byLid = new Map(patients.map((p) => [p.lid, p]));
  const taken = new Set(patients.filter((p) => p.cedula).map((p) => p.cedula));
  const totals = {};
  const conflicts = [];
  const plan = [];

  for (const { file, offset } of SOURCES) {
    const rows = JSON.parse(fs.readFileSync(path.join(OUT, file), 'utf8'));
    const ctx = { dupSource: sourceDuplicates(rows), taken, conflicts };
    for (const src of rows) {
      const patient = byLid.get(offset + src.id);
      if (!patient) continue;
      const { next, fields } = planFor(patient, src, ctx);
      if (!fields.length) continue;
      plan.push(next);
      fields.forEach((f) => { totals[f] = (totals[f] || 0) + 1; });
    }
  }

  console.log(`Pacientes a completar: ${plan.length}`);
  console.log('Campos:', JSON.stringify(totals));
  console.log(`Cédulas no aplicadas (repetidas o ya usadas por otra paciente): ${conflicts.length}`);
  conflicts.slice(0, 15).forEach((c) => console.log(`  #${c.lid} ${c.nombre} -> ${c.cedula}`));

  if (!apply) { console.log('\nDry-run. Nada escrito.'); await sequelize.close(); return; }
  const [, meta] = await sequelize.query(SQL, { replacements: { rows: JSON.stringify(plan) }, logging: false });
  console.log(`\nAplicado: ${meta.rowCount} pacientes.`);
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
