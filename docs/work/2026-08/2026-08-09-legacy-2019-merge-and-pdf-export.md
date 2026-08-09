# 2026-08-09 — Fusión de historia 2013-2019 y exportación de récipe/ecografía en PDF

## What changed

Se incorporó a producción una segunda base histórica de MedDig (`CONSULTA_2019`, 2013-2019, numeración de paciente independiente) fusionándola con los datos ya migrados por cédula: producción pasó de 2.748 pacientes / 6.666 consultas a 7.954 pacientes / 26.223 consultas, sin duplicar identidades (770 pacientes terminaron con historia de ambas épocas en una sola fila). Además se agregó récipe estructurado (`recipe_items`, antes un string concatenado) y hallazgos de ecografía (`ultrasound_findings`, antes no migrados en absoluto — vivían sin decodificar en los cientos de campos genéricos multi-especialidad de `CONSULTA.DAT`), y un endpoint que genera el récipe/informe de ecografía en PDF con el membrete de la doctora, replicando el formato de impresión de MedDig.

## Why

El usuario pidió rescatar también la historia pre-2020 (`CONSULTA_2019`) que nunca se había migrado, y — al revisar cómo se veían las consultas en el sistema viejo — pidió poder imprimir el récipe y el informe de ecografía tal como los emitía MedDig, con espacio para firma/sello.

## How

- **Fusión de identidades**: `nexus-doc-back/scripts/sync-legacy-history.js` resuelve cada paciente de 2019 por cédula contra producción (y contra los nuevos de v2) antes de decidir si es alta o fusión; los pacientes 2019 genuinamente nuevos usan `legacy_record_id = 100000 + id-original` (namespace separado, la numeración de 2019 y la de 2021 arrancan ambas en 1). Encontró y corrigió dos bugs de integridad antes de escribir: `clinical_records.legacy_record_id` tiene constraint único no reflejado en el modelo Sequelize (cada snapshot reinicia su numeración → offset `+1000000` para 2019), y el borrado de consultas viejas era soft-delete, dejando filas ocupando esos mismos IDs (se pasó a `force: true` para este reemplazo controlado).
- **Récipe/ecografía**: `data/scripts/analisis/19_extraer_ecografia_recipe.js` decodifica el subset de ~50 campos gineco-obstétricos de `CONSULTA.DAT` (de los cientos que trae el formulario genérico multi-especialidad) contra el catálogo de picklist `TAB-GENE.DAT` (cada código apunta a una columna booleana + `NOMBRE`); verificado campo por campo contra una consulta real. `nexus-doc-back/scripts/backfill-recipe-ultrasound.js` cargó esto a las 26.223 consultas ya migradas.
- **PDF**: `nexus-doc-back/libs/pdf/` (pdfkit, dependencia nueva) — `prescription-pdf.js` replica el récipe a dos columnas (farmacia/paciente), `ultrasound-pdf.js` + `ultrasound-sections.js` replican el formato de 3 columnas del informe de ecografía original. Nuevos endpoints `GET /clinical-records/:id/{prescription,ultrasound}-pdf`. `doctors.letterhead` (JSONB) guarda RIF/MPPS/CM/dirección/teléfono para el membrete.
- Migración `20260809100000-recipe-and-ultrasound-fields.js`: columnas JSONB nullable, mismo patrón que `medical_background` (sin tablas nuevas).

## Promoted knowledge

None — el mapeo de campos gineco-obstétricos de `CONSULTA.DAT` y la lógica de namespace de `legacy_record_id` quedan documentados como comentarios en los scripts citados arriba; no había una guía viva previa sobre el formato MedDig para actualizar.

## Follow-ups

- [ ] Backfill de campos de identidad (dirección, alergias, cirugías) para los 774 pacientes fusionados por cédula sigue pendiente en parte — solo se completaron los que estaban vacíos en producción (187 de 774 recibieron algún dato nuevo).
- [ ] El PDF no es pixel-perfect contra el original de MedDig (confirmado por el usuario que el récipe sí; la ecografía se rehizo a 3 columnas pero no se validó con una impresión física).
- [ ] `medications.legacy_lab_code` y el resto de pendientes de la migración original (ver `docs/work/2026-08/2026-08-04-legacy-meddig-import.md`) siguen abiertos.
