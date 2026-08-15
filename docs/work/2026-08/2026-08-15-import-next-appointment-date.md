# 2026-08-15 — Backfill "próxima consulta" (next_appointment_date)

## What changed
`scripts/import-legacy-next-appointment-2019.js` and `-2021.js` backfill `clinical_records.next_appointment_date` from the `FCH-PROX-CITA` field extracted the same day (`data` repo). **6,873 consultations updated** (4,895 from the 2019 era, 1,978 from 2021_v2). `next_appointment_date` and its UI (patient profile's `ConsultationCard`, and the consultation form's Principal tab) already existed from earlier work — this was purely a data gap, not a missing feature.

Note: the commit for this work (`1d73637`) landed correctly dated, but its own work-log entry was mistakenly filed as `2026-08-11-import-next-appointment-date.md` — today's actual date is 2026-08-15. That file's content is otherwise accurate; this entry exists so the date-indexed log matches when the work really happened, per the same correction pattern used earlier this project (`1325625`, "Fix work-log entry dates").

## Why
The user identified that this field, while already present and editable in the app, had never been backfilled from history — and correctly named where it lives in the legacy data (the "Récipe/Indicaciones" screen's "Fecha Prox. Cita").

## How
Simplest of this stretch's backfills: `FECHA` (the consultation's own date) and `FCH-PROX-CITA` live on the same `CONSULTA.DAT` row, so no join was needed to recover a missing date (unlike `INFORMES.DAT`, which needed a `(PACIENTES, CONSULTAS)` join). Same patient-matching pattern as every other import this project: cédula crosswalk for the 2019 era, `legacy_record_id` directly for 2021_v2, exact-date match to `clinical_records`, ambiguous matches (more than one consultation same day) skipped rather than guessed. Only updates rows where `next_appointment_date` is still `NULL`, so nothing a doctor may have already entered by hand gets overwritten. Verified against the real screenshot that prompted this (patient Ariangel Pineda): both her consultations now show the exact next-appointment dates from VRunner.

## Promoted knowledge
None new — routine application of the established batched-backfill pattern (load reference tables once, match in memory, single batched UPDATE via `unnest()`).

## Follow-ups
None.
