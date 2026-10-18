/**
 * Solo lectura. Pacientes sin cédula/teléfono/fecha de nacimiento en la base,
 * por era, y cuántas de ellas SÍ tienen el dato en el legacy decodificado.
 *
 * Uso: node -r dotenv/config scripts/inspect-missing-contact.js
 */
const fs = require('fs');
const path = require('path');
const sequelize = require('../libs/sequelize');

const OUT = path.join(__dirname, '..', '..', 'data', 'output');
const FILES = ['pacientes_decodificados.json', 'pacientes_decodificados_2021v2.json', 'pacientes_decodificados_2019.json'];

function load(name) {
  const file = path.join(OUT, name);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

(async () => {
  const q = (sql) => sequelize.query(sql, { type: 'SELECT', logging: false });
  const rows = await q(`SELECT legacy_record_id AS lid, cedula, phone, birth_date, first_name, created_at::date AS creada,
      CASE WHEN legacy_record_id >= 100000 THEN '2019' WHEN legacy_record_id IS NULL THEN 'app' ELSE '2021' END AS era
    FROM patients WHERE deleted_at IS NULL`);
  const by = {};
  for (const r of rows) {
    const e = (by[r.era] ||= { total: 0, sinCedula: 0, sinPhone: 0, sinNac: 0 });
    e.total += 1;
    if (!r.cedula) e.sinCedula += 1;
    if (!r.phone) e.sinPhone += 1;
    if (!r.birth_date || r.birth_date === '1900-01-01') e.sinNac += 1;
  }
  console.log('Base por era:', JSON.stringify(by, null, 1));
  const porDia = {};
  for (const r of rows.filter((x) => !x.cedula && !x.phone)) porDia[r.creada] = (porDia[r.creada] || 0) + 1;
  console.log('Sin cédula NI teléfono, por día de creación:', JSON.stringify(porDia));

  for (const f of FILES) {
    const data = load(f);
    if (!data) { console.log(`${f}: no existe`); continue; }
    const keys = Object.keys(data[0]);
    console.log(`\n${f}: ${data.length} filas; claves: ${keys.slice(0, 25).join(',')}`);
    const off = f.includes('2019') ? 100000 : 0;
    const byLid = new Map(rows.filter((r) => r.lid != null).map((r) => [r.lid, r]));
    let match = 0, cedRecuperable = 0, telRecuperable = 0, nacRecuperable = 0;
    for (const p of data) {
      const db = byLid.get(off + (p.id ?? p.CODIGO));
      if (!db) continue;
      match += 1;
      const ced = String(p.cedula ?? p.CEDULA ?? '').replace(/\D/g, '');
      const tel = String(p.celular ?? p.CELULAR ?? p.telefono ?? p.TELEFONO ?? '').replace(/\D/g, '');
      const nac = p.fechaNac ?? p['FECH-NAC'];
      if (!db.cedula && ced.length >= 6) cedRecuperable += 1;
      if (!db.phone && tel.length >= 7) telRecuperable += 1;
      if ((!db.birth_date || db.birth_date === '1900-01-01') && nac) nacRecuperable += 1;
    }
    console.log(`  match por legacy id: ${match}; recuperables -> cédula ${cedRecuperable}, teléfono ${telRecuperable}, nacimiento ${nacRecuperable}`);
  }
  await sequelize.close();
})();
