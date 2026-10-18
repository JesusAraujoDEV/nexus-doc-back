/**
 * Carga diferencial e idempotente de lo que faltaba del legacy MedDig:
 * impresiones diagnósticas, constancias, evolución, recomendaciones,
 * antecedentes personales (CIE-9), partos/abortos/ectópicos, email, teléfono
 * fijo, referido por, procedencia. Grupo sanguíneo solo con --blood-type
 * (la traducción de códigos es inferida; ver 34_extraer_paciente_extra.js).
 *
 * Fuente: data/output/{idxs_x_c,antecede,paciente_extra,consulta_extra}_<era>.json
 * (extractores data/scripts/analisis/32..35). Eras en orden: 2021_oct gana
 * sobre 2019 porque solo se rellena lo vacío.
 *
 * Uso (desde nexus-doc-back):
 *   node -r dotenv/config scripts/import-legacy-extras.js            dry-run
 *   node -r dotenv/config scripts/import-legacy-extras.js --apply    escribe (una transacción)
 *   ... --blood-type                                                 incluye grupo sanguíneo
 */
const fs = require('fs');
const path = require('path');
const { Sequelize, Op } = require('sequelize');
const { setupModels } = require('../db/models');
const M = require('./legacy-extras-mappers');

// LEGACY_DATA_DIR / LEGACY_EXTRAS_ERAS: paquete de sincronización (legacy-sync-run.js usa era "sync").
const OUTPUT = process.env.LEGACY_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'output');
const ERAS = (process.env.LEGACY_EXTRAS_ERAS || '2021_oct,2019').split(',');
const apply = process.argv.includes('--apply');
const allowBloodType = process.argv.includes('--blood-type');

const load = (name, era) => JSON.parse(fs.readFileSync(path.join(OUTPUT, `${name}_${era}.json`), 'utf8'));

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

function tally(totals, counts) {
  for (const c of counts) totals[c] = (totals[c] || 0) + 1;
}

/** Paciente de la app para una fila legacy: 2019 cruza por cédula y luego por id con offset. */
function patientResolver(patients) {
  const byLegacy = new Map(patients.filter((p) => p.legacyRecordId != null).map((p) => [p.legacyRecordId, p]));
  const byCedula = new Map(patients.filter((p) => p.cedula).map((p) => [M.digits(p.cedula), p]));
  return (row) => {
    if (row.era === '2019' && row.cedula && byCedula.has(row.cedula)) return byCedula.get(row.cedula);
    return byLegacy.get(row.patientLegacyRecordId) || null;
  };
}

function planRecords(era, recordsByLegacy, totals, unmatched) {
  const plan = new Map();
  const extras = load('consulta_extra', era);
  const idxs = groupBy(load('idxs_x_c', era), (r) => r.recordLegacyRecordId);
  const touch = (record) => plan.get(record.id) || plan.set(record.id, { record, next: {} }).get(record.id);
  for (const extra of extras) {
    const record = recordsByLegacy.get(extra.recordLegacyRecordId);
    if (!record) { unmatched.records += 1; continue; }
    const { next, counts } = M.recordChanges(record, extra);
    if (counts.length) Object.assign(touch(record).next, next);
    tally(totals, counts);
  }
  for (const [legacyId, rows] of idxs) {
    const record = recordsByLegacy.get(legacyId);
    if (!record) { unmatched.records += 1; continue; }
    const list = M.impressionsFrom(rows);
    if (!list || !M.isBlank(record.diagnosticImpressions)) continue;
    touch(record).next.diagnosticImpressions = list;
    tally(totals, ['diagnosticImpressions']);
  }
  return [...plan.values()];
}

function planPatients(era, resolve, totals, unmatched) {
  const plan = [];
  const extras = new Map(load('paciente_extra', era).map((r) => [r.legacyPatientCode, r]));
  const antecedentes = groupBy(load('antecede', era), (r) => r.legacyPatientCode);
  const codes = new Set([...extras.keys(), ...antecedentes.keys()]);
  for (const code of codes) {
    const sample = extras.get(code) || antecedentes.get(code)[0];
    const patient = resolve(sample);
    if (!patient) { unmatched.patients += 1; continue; }
    const { next, counts } = M.patientChanges(patient, extras.get(code), antecedentes.get(code), { allowBloodType });
    if (!counts.length) continue;
    Object.assign(patient, next); // la era siguiente ve lo ya rellenado
    plan.push({ patient, next });
    tally(totals, counts);
  }
  return plan;
}

async function loadState(models, doctorId) {
  const patients = await models.Patient.findAll({ where: { doctorId }, paranoid: false });
  const records = await models.ClinicalRecord.findAll({
    where: { doctorId, legacyRecordId: { [Op.not]: null } },
    paranoid: false,
  });
  return {
    patients: patients.map((p) => p.get({ plain: true })),
    recordsByLegacy: new Map(records.map((r) => [r.legacyRecordId, r.get({ plain: true })])),
  };
}

// Un UPDATE por bloque (la base remota tarda ~280 ms por ida y vuelta; fila
// por fila eran ~75 min). COALESCE(columna, nuevo) vuelve a garantizar en SQL
// que un valor existente no se pisa. private_notes y medical_background ya
// vienen calculados sobre el valor actual (anexar / fusionar).
const PATIENT_SQL = `UPDATE patients p SET
  phone = COALESCE(p.phone, v.phone),
  phone_secondary = COALESCE(p.phone_secondary, v.phone_secondary),
  email = COALESCE(p.email, v.email),
  referred_by_detail = COALESCE(p.referred_by_detail, v.referred_by_detail),
  height_cm = COALESCE(p.height_cm, v.height_cm),
  blood_type = COALESCE(p.blood_type, v.blood_type),
  medical_background = COALESCE(v.medical_background, p.medical_background),
  updated_at = NOW()
FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS v(id uuid, phone text, phone_secondary text, email text,
  referred_by_detail text, height_cm numeric, blood_type text, medical_background jsonb)
WHERE p.id = v.id`;

const RECORD_SQL = `UPDATE clinical_records c SET
  evolution = COALESCE(c.evolution, v.evolution),
  recommendations = COALESCE(c.recommendations, v.recommendations),
  medical_certificate = COALESCE(c.medical_certificate, v.medical_certificate),
  diagnostic_impressions = COALESCE(c.diagnostic_impressions, v.diagnostic_impressions),
  private_notes = COALESCE(v.private_notes, c.private_notes),
  updated_at = NOW()
FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS v(id uuid, evolution text, recommendations text,
  medical_certificate jsonb, diagnostic_impressions jsonb, private_notes text)
WHERE c.id = v.id`;

const CHUNK = 2000;

const patientRow = ({ patient, next }) => ({
  id: patient.id,
  phone: next.phone,
  phone_secondary: next.phoneSecondary,
  email: next.email,
  referred_by_detail: next.referredByDetail,
  height_cm: next.heightCm,
  blood_type: next.bloodType,
  medical_background: next.medicalBackground,
});

const recordRow = ({ record, next }) => ({
  id: record.id,
  evolution: next.evolution,
  recommendations: next.recommendations,
  medical_certificate: next.medicalCertificate,
  diagnostic_impressions: next.diagnosticImpressions,
  private_notes: next.privateNotes,
});

async function bulk(sequelize, transaction, sql, rows) {
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const [, meta] = await sequelize.query(sql, {
      replacements: { rows: JSON.stringify(rows.slice(i, i + CHUNK)) },
      transaction,
    });
    updated += meta.rowCount;
  }
  return updated;
}

async function write(sequelize, patientPlan, recordPlan) {
  return sequelize.transaction(async (transaction) => ({
    patients: await bulk(sequelize, transaction, PATIENT_SQL, patientPlan.map(patientRow)),
    records: await bulk(sequelize, transaction, RECORD_SQL, recordPlan.map(recordRow)),
  }));
}

async function main() {
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);
  const { models } = sequelize;
  const doctor = await models.Doctor.findOne();
  const state = await loadState(models, doctor.id);
  const resolve = patientResolver(state.patients);
  const totals = {};
  const unmatched = { patients: 0, records: 0 };

  const patientPlan = new Map();
  const recordPlan = new Map();
  for (const era of ERAS) {
    for (const p of planPatients(era, resolve, totals, unmatched)) {
      const prev = patientPlan.get(p.patient.id);
      patientPlan.set(p.patient.id, { patient: p.patient, next: { ...(prev ? prev.next : {}), ...p.next } });
    }
    for (const r of planRecords(era, state.recordsByLegacy, totals, unmatched)) {
      Object.assign(r.record, r.next);
      const prev = recordPlan.get(r.record.id);
      recordPlan.set(r.record.id, { record: r.record, next: { ...(prev ? prev.next : {}), ...r.next } });
    }
  }

  console.log(`Pacientes a actualizar: ${patientPlan.size} | consultas a actualizar: ${recordPlan.size}`);
  console.log(`Sin match: pacientes ${unmatched.patients}, consultas ${unmatched.records}`);
  console.log('Campos rellenados:', JSON.stringify(totals, null, 1));
  if (!allowBloodType) console.log('(grupo sanguíneo omitido: usar --blood-type cuando se confirme el orden de códigos)');

  if (!apply) {
    console.log('\nDry-run. Nada escrito.');
    await sequelize.close();
    return;
  }
  const result = await write(sequelize, [...patientPlan.values()], [...recordPlan.values()]);
  console.log(`\nAplicado: ${result.patients} pacientes, ${result.records} consultas.`);
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
