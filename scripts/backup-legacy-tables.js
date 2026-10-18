/**
 * Respaldo JSON (solo lectura) de las tablas que alimentan las cargas legacy,
 * antes de una carga diferencial. Escribe en data/output/ (ignorado por git:
 * contiene datos clínicos reales).
 *
 * Uso: DB_URL=... node scripts/backup-legacy-tables.js [etiqueta]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const TABLAS = ['patients', 'clinical_records', 'lab_exam_orders', 'medical_reports', 'pregnancies', 'referring_doctors', 'medical_centers'];

async function main() {
  const etiqueta = process.argv[2] || new Date().toISOString().slice(0, 10);
  const base = process.env.LEGACY_BACKUP_DIR || path.join(__dirname, '..', '..', 'data', 'output');
  const dir = path.join(base, `respaldo-${etiqueta}`);
  fs.mkdirSync(dir, { recursive: true });
  const s = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  for (const t of TABLAS) {
    const rows = await s.query(`SELECT * FROM ${t}`, { type: Sequelize.QueryTypes.SELECT });
    fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows));
    console.log(`${t.padEnd(20)} ${rows.length} filas`);
  }
  await s.close();
  console.log(`Respaldo en ${dir}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
