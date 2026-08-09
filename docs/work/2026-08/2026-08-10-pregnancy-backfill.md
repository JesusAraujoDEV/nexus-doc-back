# 2026-08-10 — Backfill Fichas de Embarazo from historical obstetric consultations

## What changed
The `pregnancies` table shipped the day before (see `2026-08-09-pregnancy-record.md`) was empty for real patients — obstetric consultations existed but no `Pregnancy` row linked them, so no patient showed as "embarazada ahora" despite having recent obstetric visits (e.g. Adriana Josefina Hernández Piña, last obstetric visit 18 days ago). Migration `20260810130000-backfill-pregnancies.js` groups each patient's obstetric `clinical_records` into pregnancy "episodes" by gap analysis and creates one `Pregnancy` row per episode, linking every record in it via `pregnancy_id`. Result: 2,144 pregnancy episodes created from 8,253 obstetric records (100% linked), 80 patients now correctly show as currently pregnant.

## Why
User report: "la paciente adriana hernandez piña está embarazada... pero en nuestro sistema no se ve". The category backfill from the previous day only tagged `clinical_records.category`, it never created the `Pregnancy` entities the UI/filter actually depend on.

## How
Consulted `crew:data-architect` before writing the migration (explicitly requested by the user) since this touches the partial-unique-active-pregnancy index and involves inferring structure from ambiguous historical data. Key findings verified against production before designing the approach:
- F.U.M/TRIMESTRE/EDAD-GEST-SEM/FPP were never populated in the migrated `ultrasound_findings` (0 rows across all 8,253 obstetric records) — so `lmp_date` is left `null` for all backfilled rows; a `notes` marker prompts the doctor to fill it in via the existing edit UI.
- Episodes are split wherever the gap between a patient's consecutive obstetric visits exceeds 294 days (42 weeks) — the only clinically defensible threshold, since two visits further apart than that cannot belong to the same gestation. Gap-distribution analysis (p95 = 77 days) confirmed this cleanly separates same-pregnancy visit clusters from genuinely separate pregnancies.
- Only a patient's *most recent* episode can be "active"; DA's guidance was to bias tight (180-day window, not the looser 280 initially proposed) because a false "still pregnant" positive blocks the doctor from starting a real new ficha (unique-index conflict), while a false negative just means she re-creates it — self-healing. Patients in the 180–294 day gray zone (48 of them) were finalized by default; borderline cases are listed in this entry for manual review rather than guessed at.
- Implemented as a `down()`-able migration (not a one-off script) using a `notes` marker string as the identifying tag, guarded by `WHERE pregnancy_id IS NULL` so it is safe to re-run. Verified afterward: 0 duplicate active pregnancies per patient (unique index held), all obstetric records linked, no null-`visit_date` or soft-deleted rows in scope (checked before running).
- One pre-existing manual test row (patient "Paciente Prueba", created by the user testing the feature live) already had `pregnancy_id` set on its only obstetric record, so it was naturally excluded from the backfill — no cleanup needed.

## Promoted knowledge
None new — reuses the JSONB-for-flexible-data and computed-not-stored conventions already established; the episode-gap heuristic is scoped to this one-time backfill and not a reusable pattern.

## Follow-ups
- [ ] 48 patients in the 180–294-day gray band were finalized by default (bias-tight per DA). Their `patient_id`s are in this migration's query results (re-derivable via `days_since` between 180–294 on last obstetric visit) — worth a quick pass with the doctor to flip any that are still actually pregnant back to active via the existing Edit Ficha dialog.
- [ ] `lmp_date` is `null` on every backfilled ficha — gestational age/F.P.P won't show until the doctor enters F.U.M (reported or via fecha incierta) on each one.
