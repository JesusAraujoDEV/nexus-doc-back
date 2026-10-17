/**
 * Mapeo de las salidas de data/scripts/analisis/32..35 a cambios sobre
 * patients y clinical_records. Regla única: SOLO se rellena lo vacío; un
 * valor existente nunca se pisa (puede haberlo editado la doctora).
 */

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const clean = (s) => (typeof s === 'string' ? s.replace(/\s+$/g, '').trim() : s);
const digits = (s) => String(s || '').replace(/\D/g, '');

/** Pone `value` en `target[key]` si target[key] está vacío y value no. Devuelve true si cambió. */
function fill(target, key, value) {
  if (isBlank(value) || !isBlank(target[key])) return false;
  target[key] = value;
  return true;
}

// ---------- consultas ----------

function certificateFrom(r) {
  const cert = {};
  if (!isBlank(r['DAIG-CONST'])) cert.diagnostico = clean(r['DAIG-CONST']);
  if (!isBlank(r['TRAT-CONST'])) cert.motivo = clean(r['TRAT-CONST']);
  if (r.REPOSO || r['DIAS-REPOSO']) cert.reposo = true;
  if (r['DIAS-REPOSO']) cert.diasReposo = Number(r['DIAS-REPOSO']);
  return Object.keys(cert).length ? cert : null;
}

/** Líneas que van a private_notes: F.C., observaciones y notas sueltas. */
function noteLinesFrom(r) {
  const lines = [];
  if (!isBlank(r['F-C'])) lines.push(`F.C. ${clean(String(r['F-C']))}`);
  if (!isBlank(r.OBS)) lines.push(`Obs.: ${clean(r.OBS)}`);
  if (!isBlank(r['MOT-IMP'])) lines.push(`Nota: ${clean(r['MOT-IMP'])}`);
  return lines;
}

function appendNotes(existing, lines) {
  const base = existing || '';
  const missing = lines.filter((l) => !base.includes(l));
  if (!missing.length) return null;
  return [base, ...missing].filter(Boolean).join('\n');
}

/** Cambios para una consulta a partir de su fila de consulta_extra. */
function recordChanges(record, extra) {
  const next = {};
  const counts = [];
  if (fill(next, 'evolution', isBlank(record.evolution) ? clean(extra.EVOLUCION) : null)) counts.push('evolution');
  if (fill(next, 'recommendations', isBlank(record.recommendations) ? clean(extra.RECOMENDACIONES) : null)) counts.push('recommendations');
  if (isBlank(record.medicalCertificate) && fill(next, 'medicalCertificate', certificateFrom(extra))) counts.push('medicalCertificate');
  const notes = appendNotes(record.privateNotes, noteLinesFrom(extra));
  if (notes) { next.privateNotes = notes; counts.push('privateNotes'); }
  return { next, counts };
}

/** Lista ordenada y sin repetidos de impresiones diagnósticas. */
function impressionsFrom(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const text = clean(r.idxNombre);
    if (isBlank(text) || seen.has(text.toUpperCase())) continue;
    seen.add(text.toUpperCase());
    out.push(text);
  }
  return out.length ? out : null;
}

// ---------- pacientes ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactChanges(patient, extra, next, counts) {
  const email = clean(extra.EMAIL);
  if (email && EMAIL_RE.test(email) && isBlank(patient.email) && fill(next, 'email', email.toLowerCase())) counts.push('email');
  const tel = digits(extra.TELEFONO);
  if (tel.length >= 7) {
    const phone = next.phone || patient.phone;
    if (isBlank(phone)) { next.phone = tel; counts.push('phone'); }
    else if (digits(phone) !== tel && isBlank(patient.phoneSecondary)) { next.phoneSecondary = tel; counts.push('phoneSecondary'); }
  }
  if (isBlank(patient.referredByDetail) && fill(next, 'referredByDetail', clean(extra['REF-POR']))) counts.push('referredByDetail');
  const height = Number(extra.ESTATURA);
  if (height >= 100 && height <= 220 && isBlank(patient.heightCm)) { next.heightCm = height; counts.push('heightCm'); }
}

function bloodTypeChange(patient, extra, next, counts, allowBloodType) {
  if (!allowBloodType || isBlank(extra.bloodType) || !isBlank(patient.bloodType)) return;
  next.bloodType = extra.bloodType;
  counts.push('bloodType');
}

const GINECO_KEYS = { 'NUM-PAR': 'partos', 'NUM-ABO': 'abortos', 'NUM-EMB-ECT': 'ectopicos' };

function backgroundChanges(bg, extra, counts) {
  let changed = false;
  const gineco = { ...(bg.antecedentesGinecoObs || {}) };
  for (const [src, dst] of Object.entries(GINECO_KEYS)) {
    if (extra[src] === undefined || extra[src] === null || gineco[dst] !== undefined) continue;
    gineco[dst] = Number(extra[src]);
    counts.push(dst);
    changed = true;
  }
  if (changed) bg.antecedentesGinecoObs = gineco;
  if (fill(bg, 'procedencia', clean(extra.PROCEDENCIA))) { counts.push('procedencia'); changed = true; }
  return changed;
}

/** Une antecedentes personales sin repetir (por código CIE-9 o título). */
function mergeAntecedentes(bg, rows, counts) {
  const list = Array.isArray(bg.antecedentesPersonales) ? [...bg.antecedentesPersonales] : [];
  const key = (a) => `${a.cie9 || ''}|${String(a.titulo || '').trim().toUpperCase()}`;
  const seen = new Set(list.map(key));
  let added = 0;
  for (const r of rows) {
    if (r.niega || isBlank(r.titulo)) continue;
    const item = { cie9: r.cie9 || null, titulo: clean(r.titulo) };
    if (seen.has(key(item))) continue;
    seen.add(key(item));
    list.push(item);
    added += 1;
  }
  if (!added) return false;
  bg.antecedentesPersonales = list;
  counts.push(...Array(added).fill('antecedentePersonal'));
  return true;
}

/** Cambios para una paciente. `antecedentes` = filas de antecede_<era> de esa paciente. */
function patientChanges(patient, extra, antecedentes, { allowBloodType }) {
  const next = {};
  const counts = [];
  if (extra) {
    contactChanges(patient, extra, next, counts);
    bloodTypeChange(patient, extra, next, counts, allowBloodType);
  }
  const bg = JSON.parse(JSON.stringify(patient.medicalBackground || {}));
  const bgChanged = (extra ? backgroundChanges(bg, extra, counts) : false) | mergeAntecedentes(bg, antecedentes || [], counts);
  if (bgChanged) next.medicalBackground = bg;
  return { next, counts };
}

module.exports = { recordChanges, impressionsFrom, patientChanges, isBlank, digits };
