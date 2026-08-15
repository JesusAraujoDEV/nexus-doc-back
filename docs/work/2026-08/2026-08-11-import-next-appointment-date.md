# 2026-08-11 — Backfill "próxima consulta" (next_appointment_date)

## What changed
`scripts/import-legacy-next-appointment-2019.js` and `-2021.js` backfill `clinical_records.next_appointment_date` from the `FCH-PROX-CITA` field extracted the same day (`data` repo). **6,873 consultations updated** (4,895 from the 2019 era, 1,978 from 2021_v2). `next_appointment_date` and its UI (patient profile's `ConsultationCard`, and the consultation form's Principal tab) already existed from earlier work — this was purely a data gap, not a missing feature.

## Why
The user identified that this field, while already present and editable in the app, had never been backfilled from history — and correctly named where it lives in the legacy data (the "Récipe/Indicaciones" screen's "Fecha Prox. Cita").

## How
Simplest of the day's backfills: `FECHA` (the consultation's own date) and `FCH-PROX-CITA` live on the same `CONSULTA.DAT` row, so no join was needed to recover a missing date (unlike `INFORMES.DAT` earlier the same day). Same patient-matching pattern as every other import this session: cédula crosswalk for the 2019 era, `legacy_record_id` directly for 2021_v2, exact-date match to `clinical_records`, ambiguous matches (more than one consultation same day) skipped rather than guessed. Only updates rows where `next_appointment_date` is still `NULL`, so nothing a doctor may have already entered by hand gets overwritten. Verified against the real screenshot that prompted this (patient Ariangel Pineda): both her consultations now show the exact next-appointment dates from VRunner.

## Promoted knowledge
None new — routine application of the same-day established batched-backfill pattern.

## Follow-ups
None.
