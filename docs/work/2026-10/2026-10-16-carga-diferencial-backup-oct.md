# 2026-10-16 — Enriquecimiento de las consultas del backup de octubre

## Contexto

La carga del incidente de ese mismo día (`INCIDENTE-2026-10-16-import-legacy.md`) dejó 263 consultas nuevas (legacy 7373–7635) y 87 pacientes. Las consultas entraron solo con texto: sin récipe estructurado, eco, próxima cita, ficha de embarazo, órdenes de examen ni informes. El backup traía todo eso en otras tablas.

Las dos carpetas de Drive (`-1-001` y `-1-002`) tienen el mismo `CONSULTA.DAT` (MD5 idéntico): es un solo backup partido en dos zips.

## Qué se cargó

| Dato | Filas | Escritura |
|---|---|---|
| Médico referente nuevo | 1 | INSERT |
| Récipe + eco | 249 consultas | UPDATE solo donde ambos estaban vacíos |
| Consultas reclasificadas a obstetricia | 83 | UPDATE de `category` en esas mismas filas |
| Próxima cita | 71 | UPDATE solo donde estaba vacía |
| Órdenes de examen | 365 | INSERT |
| Informes médicos | 34 | INSERT |
| Fichas de embarazo nuevas | 21 | INSERT |
| Consultas vinculadas a ficha | 83 (54 a fichas existentes, 29 a nuevas) | UPDATE solo donde `pregnancy_id` era null |
| F.U.M./F.P.P. en fichas nuevas | 21 | UPDATE con el guard de "ficha no editada" |

Ninguna fila preexistente se borró ni se sobrescribió. Respaldo previo en `data/output/respaldo-2026-10-16-pre-oct-sync/`.

## Cambios en scripts

- `import-legacy-lab-exam-orders-2021.js` y `import-legacy-medical-reports-2021.js` eran INSERT plano: re-correrlos sobre un backup nuevo duplicaba todo. Ahora omiten lo que ya existe y son dry-run sin `--apply`.
- En informes, el contenido no sirve como clave de duplicado: el extractor arrastra 1-2 bytes de prefijo del bloque `.CND` que cambian entre backups. La primera versión con hash de contenido proponía 295 informes, de los cuales 260 ya estaban cargados. Se pasó a `(consulta, título)` y se limpia el prefijo al insertar.
- Nuevos: `backfill-recipe-ultrasound-snapshot.js` (versión acotada del backfill, por snapshot y solo filas vacías), `link-new-obstetric-records.js` (crea/vincula fichas de embarazo para consultas obstétricas nuevas, mismo criterio y marcador que la migración `20260810140000`), `check-legacy-integrity.js`, `backup-legacy-tables.js` y tres de inspección.

## Verificación

`check-legacy-integrity.js`: 0 órdenes huérfanas, 0 órdenes o informes duplicados, 0 pacientes con dos embarazos activos, 0 consultas obstétricas sin ficha, 0 consultas legacy duplicadas.

Queda 1 paciente "Sin nombre" (legacy 1748, creado 2026-08-04). Es previo a esta carga y no se tocó.

## Lo que no quedó cubierto

- Las 22 consultas nuevas que no recibieron récipe ni eco simplemente no lo tenían en el legado (`con_tratamiento` 240 de 263 coincide con `con_recipe_items` 240).
- Órdenes e informes saltean las consultas cuando la paciente tiene más de una consulta el mismo día (583 órdenes y 21 informes de todo el backup, no solo de las nuevas). Es la regla heredada de los imports originales.
- Los scripts de la era 2019 no se revisaron para idempotencia.
