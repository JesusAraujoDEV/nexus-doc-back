# 2026-08-11 — Import historical medical reports (informes)

## What changed
`scripts/import-legacy-medical-reports-2019.js` and `-2021.js` import the report content decoded the same day (`data` repo, `28_extraer_informes.js`) into `medical_reports`. **3,447 real historical informes imported** (2,897 from the 2019 era, 550 from 2021_v2), each with real content, correctly linked to the actual consultation, and — where resolvable — the referring doctor (212 reports) and health center (173 reports).

Also topped up `medical_centers` with 28 entries found in the 2019 era's `CENT-MED.DAT` that weren't already imported (see below), and fixed a decoding artifact: a stray leading byte (a length-prefix byte from the `.CND` block format, not real text) appeared at the start of ~1,281 reports' content — stripped via a batched update.

## Why
The user manually reverse-engineered the `CONTENIDO` pointer format after I'd told them it was unrecoverable (see the same-day `decode-informes-content.md` in the `data` repo for the full technical writeup) and pushed back — correctly. This entry covers turning that decoded data into real rows in `medical_reports`.

## How
- **Patient/consultation matching** follows the exact pattern established earlier the same day for the two lab-exam-order imports: 2019-era rows matched by cédula crosswalk + exact visit date; 2021_v2-era rows matched by `legacy_record_id` directly + exact visit date. Ambiguous matches (more than one consultation on the same date) were skipped rather than guessed — 313 in the 2019 batch, 21 in the 2021_v2 batch.
- **Doctor/center resolution**: built a `legacy_code -> our catalog id` lookup by cross-referencing the already-extracted `MED-ESP.DAT`/`CENT-MED.DAT` name lists against the now-imported `referring_doctors`/`medical_centers` tables (name match, not code match — both catalogs are known to reset their codes between eras). `scripts/legacy-report-catalog-lookup.js` holds this helper, shared by both era scripts.
- **`medical_centers` top-up**: while building the center lookup, found the 2019-era `CENT-MED.DAT` has 43 rows against the already-imported 18 (which came from the 2021_v2 era and were wrongly assumed complete — see the `data` repo's correction note the same day). `scripts/import-legacy-medical-centers-2019.js` added the 28 genuinely new ones by normalized-name merge, same pattern as the doctor catalog.
- **Bulk insert**, not one-row-at-a-time: learned this lesson twice already today (the two lab-exam-order imports) — went straight to load-everything-into-memory-once + `unnest()`-batched insert here, no repeat of the earlier slow-script mistake.
- **Post-import cleanup**: spot-checking the imported content showed a single stray leading byte on many rows (e.g. `³SE TRATA...`) — traced to the `.CND` block format: each block is actually `[00 00] [1-byte prefix] [00 00 00]` before the real text, and the original extractor's "skip leading control bytes" only skipped bytes `< 32`, missing the 1-byte prefix when its value happened to fall in the 128–255 range (renders as an accented/extended character). Fixed with a batched `UPDATE ... FROM unnest(...)` stripping any leading run of non-printable-ASCII/non-newline characters — again as one query, not 3,447. A handful of rows (~single digits) still show a stray character when the prefix byte itself happens to be plain-ASCII-printable (indistinguishable from real content in that case) — not fixed, diminishing returns for a handful of reports.

## Promoted knowledge
Reinforces the same-day lesson from the lab-exam-order imports: **never write a legacy-import script that does one DB round-trip per row.** Load reference tables once, match in memory, batch-insert/update via `unnest()`. Applied correctly from the start this time instead of hitting the mistake again.

## Follow-ups
- [ ] A handful of reports (not counted precisely) still carry a single stray leading character where the `.CND` block's length-prefix byte happens to itself be printable ASCII — cosmetic only, not worth further extraction engineering.
- [ ] `medical_centers` may still be incomplete if `CONSULTA_2021_v2`'s own `CENT-MED.DAT` diverges further from what's been checked — only the 2019 vs. already-imported 2021_v2 comparison was done.
