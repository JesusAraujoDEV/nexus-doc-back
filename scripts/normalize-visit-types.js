/**
 * Normaliza los visit_type existentes a los 20 tipos canónicos definidos
 * por el data-architect. El texto original que no cabe en el canónico se
 * preserva en un campo visit_reason_detail (si la migración ya lo creó).
 *
 * Reglas aplicadas en orden (primera que matchea gana):
 *   1. PRENATAL (fuzzy)
 *   2. CONTROL GINECOLOGICO (fuzzy)
 *   3. POST PARTO / POST CESAREA
 *   4. BIOPSIA
 *   5. ECOGRAFIA
 *   6. AMENORREA
 *   7. HIPERMENORREA
 *   8. SANGRADO VAGINAL
 *   9. IRREGULARIDAD MENSTRUAL
 *  10. DOLOR PELVICO
 *  11. DISURIA
 *  12. PRURITO VAGINAL (incluye flujo, vaginitis)
 *  13. PROCEDIMIENTO (cauterización, DIU, implante)
 *  14. PLANIFICACION FAMILIAR
 *  15. SEGUNDA OPINION
 *  16. MENOPAUSIA
 *  17. ITS
 *  18. RESULTADO DE ESTUDIOS
 *  19. DESEO DE EMBARAZO / INFERTILIDAD
 *  20. Si no matchea nada y >50 chars → OTRO
 *  21. Todo lo demás con <5 ocurrencias → OTRO
 *
 * Uso: DB_URL=... node scripts/normalize-visit-types.js [--aplicar]
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const REGLAS = [
  { canon: 'PRENATAL', test: (v) => /PRENATAL|PRE\s*NATAL|PRENA[^L]?/i.test(v) && !/POST|TERMINAR/i.test(v) },
  { canon: 'CONTROL GINECOLOGICO', test: (v) => /CONTROL.*GINE|GINEC.*CONTROL|^CONTROL$|^CONTRO\b|^CONTOL|^CONTREOL|^CCONTROL/i.test(v) && !/PRENATAL/i.test(v) },
  { canon: 'POST PARTO', test: (v) => /POST\s*(CESAREA|PARTO|OPERATORIO|LEGRADO|HISTERECTOMIA|MIOMECTOMIA|HIETERECTOMIA)/i.test(v) },
  { canon: 'BIOPSIA', test: (v) => /BIOPSIA|^BX$/i.test(v) && v.length < 50 },
  { canon: 'ECOGRAFIA', test: (v) => /^SOLO\s*ECO|^ECO\s|^ECOGRAFIA/i.test(v) },
  { canon: 'AMENORREA', test: (v) => /AMENORREA/i.test(v) && !/CONTROL/i.test(v) },
  { canon: 'HIPERMENORREA', test: (v) => /HIPERMENORREA|HEMORRAGIA|SANGRADO\s*ABUNDANTE/i.test(v) },
  { canon: 'SANGRADO VAGINAL', test: (v) => /SANGRADO|MANCHADO/i.test(v) && !/CONTROL/i.test(v) },
  { canon: 'IRREGULARIDAD MENSTRUAL', test: (v) => /IRREGULARIDAD|IREEGULARIDAD|DESCONTROL\s*(DE\s*)?REGLA|DESCONTROL\s*MESTRUAL/i.test(v) },
  { canon: 'DOLOR PELVICO', test: (v) => /DOLOR\s*(PELV|ABDOM|VIENTRE|BAJO\s*VIENTRE|LUMBAR|EN\s*PELVIS)/i.test(v) && !/CONTROL/i.test(v) },
  { canon: 'DISURIA', test: (v) => /DISURIA|INFECCION\s*URINARIA|^ITU$|ARDOR\s*(AL\s*)?ORINAR/i.test(v) && !/CONTROL/i.test(v) },
  { canon: 'PRURITO VAGINAL', test: (v) => /PRURITO|FLUJO|VAGINITIS|CANDID|GADNERELLA|MICOSIS|MAL\s*OLOR|RESEQUEDAD/i.test(v) && !/CONTROL/i.test(v) },
  { canon: 'PROCEDIMIENTO', test: (v) => /PROCEDIMIENTO|CAUTERIZ|COLOCACION|RETIRO.*DIU|RETIRO.*IMPLANTE|RETIRO.*MIRENA|LEGRADO|JORNADAS/i.test(v) },
  { canon: 'PLANIFICACION FAMILIAR', test: (v) => /PLANIFICACION|ANTICONC/i.test(v) },
  { canon: 'SEGUNDA OPINION', test: (v) => /SEGUNDA\s*OPINION/i.test(v) },
  { canon: 'MENOPAUSIA', test: (v) => /MENOPAUSIA|CLIMATERIO|VAPOR|OSTEOPENIA|OSTEOPOROSIS/i.test(v) },
  { canon: 'INFECCION DE TRANSMISION SEXUAL', test: (v) => /\bITS\b|VPH|HERPES|CONDILOMA|VERRUGA/i.test(v) && !/CONTROL/i.test(v) },
  { canon: 'RESULTADO DE ESTUDIOS', test: (v) => /^RESULTADO|^DENSIMETRIA|^MAMOGRAFIA/i.test(v) },
  { canon: 'DESEO DE EMBARAZO', test: (v) => /DESEO\s*DE\s*EMBARAZO|INFERTILIDAD|FERTILIDAD/i.test(v) },
  { canon: 'SOSPECHA DE EMBARAZO', test: (v) => /SOSPECHA\s*DE\s*EMBARAZO|PRUEBA.*EMBARAZO/i.test(v) },
];

function clasificar(visitType) {
  if (!visitType || !visitType.trim()) return null;
  const v = visitType.trim();
  for (const r of REGLAS) {
    if (r.test(v)) return { canon: r.canon, detail: v !== r.canon ? v : null };
  }
  // Si es largo, probablemente un diagnóstico
  if (v.length > 50) return { canon: 'OTRO', detail: v };
  return null; // no se toca
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });

  const rows = await sequelize.query(
    'SELECT DISTINCT visit_type FROM clinical_records WHERE deleted_at IS NULL AND visit_type IS NOT NULL ORDER BY visit_type',
    { type: Sequelize.QueryTypes.SELECT },
  );

  const cambios = new Map(); // canon -> [{ from, detail }]
  let sinCambio = 0;
  for (const { visit_type } of rows) {
    const res = clasificar(visit_type);
    if (!res) { sinCambio++; continue; }
    if (res.canon === visit_type) { sinCambio++; continue; }
    if (!cambios.has(res.canon)) cambios.set(res.canon, []);
    cambios.get(res.canon).push({ from: visit_type, detail: res.detail });
  }

  let totalFilas = 0;
  for (const [canon, items] of [...cambios.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${canon} (${items.length} variantes):`);
    for (const it of items.slice(0, 8)) console.log(`  "${it.from}"`);
    if (items.length > 8) console.log(`  ... y ${items.length - 8} más`);

    if (aplicar) {
      for (const it of items) {
        const [, meta] = await sequelize.query(
          'UPDATE clinical_records SET visit_type = :canon, updated_at = NOW() WHERE visit_type = :from AND deleted_at IS NULL',
          { replacements: { canon, from: it.from } },
        );
        totalFilas += meta.rowCount;
      }
    }
  }

  console.log(`\nResumen: ${cambios.size} canónicos afectados, ${[...cambios.values()].reduce((s, v) => s + v.length, 0)} variantes`);
  console.log(`Sin cambio: ${sinCambio} tipos`);
  if (aplicar) console.log(`Filas actualizadas: ${totalFilas}`);
  else console.log('(ensayo en seco — correr con --aplicar)');

  // Mostrar resultado final
  if (aplicar) {
    const check = await sequelize.query(
      'SELECT visit_type AS type, COUNT(*)::int AS n FROM clinical_records WHERE deleted_at IS NULL GROUP BY 1 ORDER BY n DESC LIMIT 25',
      { type: Sequelize.QueryTypes.SELECT },
    );
    console.log('\nTop 25 tipos después de normalizar:');
    for (const r of check) console.log(`  ${String(r.n).padStart(5)}  ${r.type}`);
  }

  await sequelize.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
