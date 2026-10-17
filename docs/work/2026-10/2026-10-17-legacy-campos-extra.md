# Migración de los campos legacy pendientes

## Qué faltaba

Una auditoría del legacy MedDig encontró datos con valor clínico que no se migraban: impresión diagnóstica por consulta (IDXS-X-C), constancias con reposo, evolución, recomendaciones, antecedentes personales (ANTECEDE, CIE-9), partos/abortos/ectópicos, teléfono fijo, email y referido por.

## Cambios

- Migración `20261017110000-legacy-extra-fields`: `clinical_records.evolution`, `recommendations`, `medical_certificate` (JSONB), `diagnostic_impressions` (JSONB); `patients.email`, `phone_secondary`. La API los acepta en create/update.
- `scripts/import-legacy-extras.js`, junto con `legacy-extras-mappers.js`: lee las salidas de los extractores `data/scripts/analisis/32..35` de las eras 2021_oct y 2019. Solo rellena lo vacío: `COALESCE` en el SQL y merge en `medical_background`. Escribe en bloques dentro de una transacción. La escritura fila por fila tardaba ~75 min por la latencia de la base (~280 ms por consulta); en bloques tarda 45 s.
- El frontend muestra y edita los campos nuevos (commit en nexus-doc).

## Resultado (2026-10-17)

- 4.028 pacientes y 12.437 consultas actualizadas. 0 sin vínculo. El segundo dry-run planea 0 cambios.
- Impresiones diagnósticas: 10.996 consultas.
- Constancias: 1.740. Evolución: 706. Recomendaciones: 358.
- Partos: 2.057. Abortos: 1.004. Ectópicos: 113.
- Antecedentes personales: 1.090.
- Teléfono secundario: 1.423. Teléfono principal: 119 (pacientes que no tenían).
- `check-legacy-integrity.js` OK. El paciente "Sin nombre" es el 1748, que ya existía antes de esta carga.
- Respaldo previo: `data/output/respaldo-pre-extras-2026-10-17/`.

## Pendiente

- Grupo sanguíneo: el texto de los códigos está en el `.vam` cifrado. La traducción 1=A, 2=B, 3=AB, 4=O y Rh 1=+, 2=− es inferida por distribución. Se carga con `--blood-type` cuando se confirme en VRunner con una paciente conocida.
- `PACIENTE.ANT-PER` y `ANT-FAM` apuntan al `.CND`, y ahí podría haber antecedentes familiares en texto. No se revisó.
- Las plantillas de récipe (`DE-PLA-R`, `PLAN-RP`) y de informe (`PLANT-IN`) existen con contenido. No se migraron.
