# 2026-08-04 — Legacy MedDig import: schema + doctor seed + 2,733 patients

## What changed
Activated crew at project scope. Recovered an orphaned migration (`20260221120000-add-medical-fields-to-patients.js`, commit `587977c`, applied to production in Feb 2026 but dropped from `main`'s history) and added a new migration (`20260804125000-legacy-import-fields.js`) making `clinical_records` fields nullable and adding `visit_type`/`legacy_record_id` traceability. Seeded the doctor account (Dra. Rosana Arteaga) and bulk-imported 2,733 patients recovered from the legacy MedDig/VRunner system into production.

## Why
The clinic's ~20 years of patient history lived in a proprietary MedDig/VRunner binary database being decommissioned (see companion work in the `nexusdoc/data` repo). The live schema had no columns for address/allergies/surgical history/habits and required fields (`cedula`, `birth_date`, clinical_records' `symptoms`/`diagnosis`/`treatment`/`private_notes`) the legacy extraction can't fully populate. `docs/decisions/0001-legacy-meddig-import.md` records the schema reasoning.

## How
`db/migrations/20260804125000-legacy-import-fields.js` + updated `db/models/patient_model.js` and `clinical_record_model.js`. Reused the already-existing `patients.address` (TEXT) and `patients.medical_background` (JSONB) columns from the recovered Feb migration instead of adding duplicate columns — `medical_background` now carries `{ notas, alergias, cirugiasPrevias, habitos }` per patient. One-off scripts: `scripts/seed-doctor.js` (User+Doctor, bcrypt-hashed temp password) and `scripts/import-legacy-patients.js` (reads `nexusdoc/data/output/pacientes_CONSULTA_2021_con_nombres.json`, splits `nombre` into first/last, bulk-creates `Patient` rows with `legacy_record_id` for traceability). Both run directly against the production `DB_URL` (port 5438, not the default 5432 — the DB is only reachable on that port from outside Dokploy's network).

Clinical records (6,665 consultations) were deliberately **not** imported this pass: the `CONSULTA.DAT` → `PACIENTE.DAT` pointer field was never decoded during extraction, so there is no verified patient linkage. Importing them with a guessed linkage risked attaching real diagnoses/treatments to the wrong patient — rejected as unacceptable for medical data. `CONSULTA.DAT` was also locked by a live VRunner process at the time, blocking even a read-only check.

## Promoted knowledge
`docs/decisions/0001-legacy-meddig-import.md` — the schema-fit decision and rejected alternatives (staging table, drop incomplete records, fabricate placeholder cedula/birth_date).

## Follow-ups
- [ ] Decode or otherwise verify the `CONSULTA.DAT` → `PACIENTE.DAT` patient pointer before importing the 6,665 legacy consultations into `clinical_records`.
- [ ] Backfill `cedula`/`birth_date`/`history_number` per patient as they're seen again in the new system (bulk recovery from the legacy binary was not possible).
- [ ] Doctor's temporary password was generated and shown once in chat — confirm it was rotated after first login.
