# 2026-08-09 — Import real F.U.M./gesta from EMBARAZO.DAT

## What changed
`scripts/import-legacy-pregnancies.js` reads the 579 pregnancy records decoded from `CONSULTA_2021_v2/EMBARAZO.DAT` (data repo, once the user closed whatever held it locked) and writes real F.U.M., gesta number, finalized/loss/ectopic flags and fetal sex onto the matching `pregnancies` rows. 576 of 579 updated; the reported patient (Eylin Gomez) now shows F.U.M. 2025-12-26, gesta N°2, 32 weeks 2 days gestational age and F.P.P. 2026-10-02 — an exact match to VRunner's own screen.

## Why
Direct continuation of the same-day backfill correction: F.U.M. import was blocked pending the source file being unlocked on the user's machine. The user closed it and asked to retry.

## How
- Matched each `EMBARAZO.DAT` row to a `pregnancies` row by **both** `patients.legacy_record_id = PACIENTES` and `clinical_records.ultrasound_findings->>'EMBARAZOS' = CODIGO` for that same patient — the double check was necessary because the `EMBARAZOS` code range collides across the two separate legacy eras (`CONSULTA_2019` vs `CONSULTA_2021_v2`) found earlier; verifying the patient identity too eliminates that collision risk entirely (a false match would need both the same patient AND the same code by coincidence).
- Only updates rows still provably untouched (`updated_at = created_at`, `lmp_date`/`newborn_data` still null) — same non-destructive guard used in the correction migration, so nothing a doctor may have already entered by hand gets overwritten.
- `pregnancy_number` and `fetal_sex` are overwritten with the legacy values (real gesta number, not our guessed sequential count); `legacy_code` is now populated (safe here — matching is scoped to one already-verified file/patient pair, not treated as globally unique across eras).
- 579 records × several sequential queries each, run as one transaction against the remote production DB — took a few minutes over the network, not evidence of a problem.
- Result: 576 updated, 3 `sinFicha` (no linked pregnancy found for that code — worth a follow-up look, likely edge cases from the 7 overlapping-episode patients noted in the correction entry), 0 patients unmatched, 0 ambiguous matches, 0 skipped as already-edited.

## Promoted knowledge
None new — this closes out the two follow-ups left open in `2026-08-09-pregnancy-backfill-correction.md` (F.U.M. import) using the same verified-join principle already documented there.

## Follow-ups
- [ ] 3 rows had no matching linked pregnancy (`sinFicha`) — worth a quick look at which patients, likely related to the known 7 overlapping-episode cases.
- [ ] `EMB-CERR.DAT` (auto-finalized pregnancies, 477 rows in this same export) was decoded but not imported — lower priority, mostly system-generated closure records with little structured data (`DATOS` is free text).
- [ ] The `data` repo's `output/embarazo_2021_v2.json` is a point-in-time extraction; if `EMBARAZO.DAT` grows with new pregnancies, this import is not automatically kept in sync — future obstetric consultations already get a `pregnancies` row via the app itself (no legacy import needed for those going forward).
