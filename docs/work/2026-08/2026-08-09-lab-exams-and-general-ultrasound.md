# 2026-08-09 — Lab exams module + general ultrasound module (backend)

## What changed
Two new consultation modules requested by the user, plus an optional weight/height pair on patients:

- `patients.weight_kg` / `patients.height_cm` (nullable decimals) — optional fields on patient create/edit.
- **Lab exams**: `lab_exam_orders` table pairs an order and its eventual result in one row (nullable FKs to the ordering and result-recording `clinical_records`, a CHECK requiring at least one), so a result recorded weeks later — possibly in a different consultation — just fills in the same row instead of needing a join table. Reuses the pre-existing `lab_exams` catalog table (178 rows, imported 2026-08-04) rather than creating a duplicate — added a `category` column to it (best-guess seed from the legacy `TP-EXM` code, editable). `clinical_records` gained two consultation-level flags, `indicates_prescription`/`indicates_imaging_study`, matching the "Se indican Rx" / "Se indica estudio de imágenes" checkboxes on the legacy screen. A new `POST /catalogs/lab-exams` lets the doctor add an exam to the catalog on the fly, same UX as adding a medication in the récipe module.
- **General ultrasound**: `general_ultrasounds` table, one row per (consultation, sub-type) with a unique constraint on that pair, `findings` as JSONB keyed by the legacy field codes (`EC-HIG`, `EC-RIN-D-L`, etc.) — 9 sub-types (abdominal, hepatobiliar, partes_blandas, mamario, pelvico_transvaginal, prostatico, renal, tiroideo, testicular), listed in `libs/general-ultrasound-types.js`. Separate from the existing gyneco/obstetric ultrasound module (`clinical_records.ultrasound_findings`) — a consultation can carry both, and can carry more than one general sub-type (e.g. abdominal + renal same visit). A new suggestions endpoint (`GET /clinical-records/suggestions/general-ultrasound?field=...`) gives the same "type and get autocomplete from your own prior entries" behavior already used for medications/diagnoses/the gyneco-obstetric ultrasound.

All new endpoints smoke-tested end-to-end against production (catalog list/create, order → pending-for-patient → record-result, general-ultrasound save/fetch/suggestions) using real patient data, then cleaned up.

## Why
The doctor's paper/legacy workflow has two more structured screens ("Examen de laboratorio" with 5 category filters, and a general-body-ultrasound screen with 9 study types) that the app didn't have yet — she was still typing lab orders as a single free-text field and had no general ultrasound module at all.

## How
Consulted `crew:data-architect` (explicitly requested by the user, twice reminded mid-session) before writing any migration, since this is exactly the kind of order/result relationship and module-boundary call that's hard to reverse later. Key decisions from that review:
- One `lab_exam_orders` table, not two (order+result), because both real cases exist — an order that never gets a result, and a result for an exam ordered in a past visit — and a single nullable-FK-pair row avoids inventing a join table for a 1:1 relationship this practice will never need to be 1:many.
- `general_ultrasounds` is its own table (not a JSONB column, not an extension of the existing gyneco/obstetric findings) because the sub-type is a real dimension (9 values, and a consultation can legitimately carry two of them at once — e.g. abdominal + renal), and because touching the already-verified obstetric JSONB shape for an unrelated module is pure risk with no upside.
- Autocomplete needs no new schema: scans the JSONB live (same as the existing suggestions service), scoped to one doctor's few-thousand-row table — a `ponytail:` scale ceiling, not a real index yet.
- Discovered mid-implementation that a `lab_exams` catalog table already existed from an earlier session (2026-08-04, 178 rows imported) — reused it instead of creating a duplicate `lab_exam_catalog` table DA's brief had assumed didn't exist yet; only added the missing `category` column.

Legacy field mapping verified against real VRunner screenshots and decoded structure:
- General ultrasound fields (all `EC-`-prefixed) live directly in `CONSULTA.DAT` itself — the same generic multi-specialty legacy form already used for the gyneco/obstetric fields (`data/scripts/analisis/19_extraer_ecografia_recipe.js`) — confirmed by dumping the full 591-field list from `CONSULTA_2019/CONSULTA.DAT` (the 2021_v2 copy was locked at investigation time).
- Lab-exam category catalog: `EXAM-LAB.DAT`'s `TP-EXM` field (values 1–5) and `ORDEN-EX.DAT`'s per-order boolean flags `TP-EXM-1..5` are almost certainly the "Todos/Químicos/Bioquímicos/Hemáticos/Microbiológicos/Otros" filter tabs, but no catalog table names the 5 labels — stored as a plain integer code with labels living in app config, not the database, so a wrong guess costs a one-line rename instead of a migration.
- Historical lab-exam **orders** (`ORDEN-EX.DAT`) could not be imported this round: the file is 840MB / ~3.7M rows, and the project's existing generic table-reader's brute-force byte-alignment search (built for tables up to a few MB) doesn't scale to it in reasonable time — confirmed by estimating candidate count (3.68M) before attempting. Historical lab-exam **results** don't exist to import regardless — `RES-EXM-.DAT` is essentially empty in every snapshot checked, meaning results were never digitally recorded historically.

## Promoted knowledge
None new — reuses the JSONB-for-flexible-data, per-doctor-scan-for-suggestions, and paranoid/soft-delete conventions already established.

## Follow-ups
- [ ] Historical `ORDEN-EX.DAT` import (840MB, ~3.7M rows) is unresolved — needs a smarter geometry-search approach (e.g. direct offset calculation validated by content, rather than the current brute-force candidate search) before it's feasible; not blocking, since the new module works standalone going forward.
- [ ] `lab_exams.category` mapping (1–5 → Químicos/Bioquímicos/Hemáticos/Microbiológicos/Otros) is a best guess from legacy flags, not confirmed against a real catalog table — worth a quick sanity pass with the doctor once she starts using the category filter.
- [ ] Frontend for both modules (consultation tabs) not yet built — this entry covers backend only.
