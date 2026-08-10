# 2026-08-09 — Correct pregnancy backfill: categorization gap + legacy EMBARAZOS grouping

## What changed
Migration `20260810140000-fix-pregnancy-backfill-with-embarazos-code.js` reverts the same-day date-gap-based backfill (`2026-08-09-pregnancy-backfill.md`) and redoes it: (1) broadens `clinical_records.category` to catch 1,882 obstetric records the original backfill missed, and (2) re-groups episodes by the legacy `EMBARAZOS` code found in `ultrasound_findings` instead of guessing from visit-date gaps. Result: 2,295 episodes (up from 2,144), all 10,135 obstetric records now linked (up from 8,253), and the reported patient (Eylin Gomez) now has one active pregnancy with all 9 of her prenatal visits linked, instead of zero.

## Why
User report: opened Eylin Gomez's profile — the app showed her as pregnant but with no F.U.M., no F.P.P., and an **empty** evolution list, while VRunner's real "Embarazo" screen showed a full history and a real F.U.M. (26-Dic-2025). Root cause: her two most recent prenatal visits had `ultrasound_findings` without the four marker keys the original category backfill checked for (`TRIMESTRE`/`DBP`/`EDAD-GEST-SEM`/`SAC-GES`), so they stayed tagged `gynecology` and never linked to her pregnancy episode — that's why "Evolución" was empty even though the ficha existed.

## How
Consulted `crew:data-architect` twice (explicitly requested by the user): once for the corrected grouping strategy, once implicitly via its own follow-up questions that surfaced a real risk before I trusted the fix.

- Investigating the empty-evolution report led to reverse-engineering the legacy `EMBARAZO.DAT` file (VRunner's actual pregnancy table, never migrated) using the project's existing generic Velneo-table reader (`data/scripts/analisis/tabla.js`, self-describes field names/types — no manual byte-offset work needed). Its fields decode cleanly and match VRunner's UI almost 1:1: `FUM`, `NUMERO-EMB` (gesta number), `FEC-PROB-PARTO-DES/HAS` (due-date range), newborn fields, and — critically — every `CONSULTA.DAT` obstetric record carries an `EMBARAZOS` field that is that table's own `CODIGO`.
- DA's review flagged (correctly) that I hadn't verified whether `EMBARAZOS` was a real global identifier or a small per-patient counter before trusting it. Checking: 1,719 distinct values, range 1–1,724 (dense, not 1–15 — ruled out "counter"), but **575 of those 1,719 values (33%) are shared by more than one patient** — ruling out "safe global identifier" too. Conclusion: it's real and stable *within one patient's own records* (safe as a `(patient_id, code)` grouping key — every one of Eylin's 9 obstetric visits does carry the same code, 525) but not safe to store as `pregnancies.legacy_code` (which is `UNIQUE`) or to treat as a live foreign key — the only accessible `EMBARAZO.DAT` copies are stale snapshots (43 records from Feb 2026; 1,721 records covering only up to ~2019–2020), and the freshest export (`CONSULTA_2021_v2/EMBARAZO.DAT`, on the user's machine) is OS-locked by another process (confirmed via a raw exclusive-open attempt — not something fixable from this side). So `legacy_code` stays null; F.U.M. still cannot be imported this round.
- The migration reverts the previous backfill's rows only if they're provably untouched since (`updated_at = created_at`, `lmp_date`/`newborn_data` still null, marker intact) — aborts loudly instead of silently discarding hand-entered data if that check fails.
- Added an in-migration acceptance check asserting the reported case (Eylin: exactly one pregnancy, zero unlinked obstetric records, one active) — the migration aborts if it doesn't hold, rather than trusting aggregate counts alone.
- Episode-grouping logic extracted to `db/migrations/lib/group-pregnancy-episodes.js` to keep the migration file under the project's file-size ceiling.

## Promoted knowledge
None new beyond what's already noted in the original backfill entry — the `EMBARAZOS`-code-collision finding is migration-specific investigative detail, not a reusable pattern.

## Follow-ups
- [ ] **F.U.M./F.P.P. still blocked.** The freshest `EMBARAZO.DAT` (with real, current F.U.M. values) is locked on the user's machine by an unidentified process — needs the user to close whatever holds it, or re-export the folder, before a follow-up migration can join in real dates. Every backfilled ficha's `notes` field already tells the doctor to ask the patient and fill it in manually as a stopgap.
- [ ] 7 patients have two `EMBARAZOS`-code episodes with overlapping visit-date ranges (pre-existing legacy data inconsistency, not introduced by this migration) — worth a manual look if noticed in the UI.
- [ ] The 180-day active-window gray band (48 patients, noted in the original entry) still applies unchanged.
