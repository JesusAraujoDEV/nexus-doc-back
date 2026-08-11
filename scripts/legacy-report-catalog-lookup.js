/** Resuelve un código legado (MED-ESP/CENT-MED de una era) -> id en nuestro catálogo, por nombre normalizado. */
const fs = require('fs');

function normaliza(nombre) {
  return (nombre || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

/** jsonPath: salida de 27_extraer_med_esp.js o 29_extraer_cent_med.js (campo `codigo` + `nombre`). */
function buildLookup(jsonPath, dbRows) {
  const porNombre = new Map(dbRows.map((r) => [normaliza(r.name), r.id]));
  const filas = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const lookup = new Map();
  for (const fila of filas) {
    const id = porNombre.get(normaliza(fila.nombre));
    if (id) lookup.set(fila.codigo, id);
  }
  return lookup;
}

module.exports = { buildLookup, normaliza };
