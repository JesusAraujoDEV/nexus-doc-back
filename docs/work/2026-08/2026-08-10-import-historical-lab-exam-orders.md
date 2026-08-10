# 2026-08-10 — Import historical lab-exam orders from CONSULTA_2019

## What changed
`scripts/import-legacy-lab-exam-orders-2019.js` imports the 26,654 real historical lab-exam orders decoded from `ORDEN-EX.DAT` (see the same-day `fix-geometria-search-for-huge-tables` data-repo entry) into `lab_exam_orders`. **20,389 imported.**

## Why
The user pushed back on treating `ORDEN-EX.DAT` as unreachable ("no deberías buscar otra forma de solucionar esto?") — right call: the file wasn't too big to read, the search algorithm just didn't scale. Once decoded, importing the real historical orders was straightforward and valuable — the new lab-exams module otherwise starts with zero history for every patient.

## How
Same cédula-based patient matching as the same-day pregnancy imports (this era's `PACIENTE.DAT` numbering doesn't align with `patients.legacy_record_id`). Consultation matching uses exact `visit_date` rather than a date window — `ORDEN-EX.DAT`'s `FECHA` is the literal date of the visit that ordered the exam, not an approximation. Exam catalog matched by `lab_exams.legacy_code`, already populated from that table's own earlier import.

**Two bugs hit and fixed while writing this, worth recording:**
1. **First version was too slow to finish.** One row at a time, ~5 sequential DB round-trips each (patient lookup, exam lookup, record lookup, dedup check, insert) — ~130,000 round-trips against a connection with 2.5s single-query latency at the time (the user's internet was degraded, confirmed by measuring `SELECT 1` directly). Killed after the user asked for a time estimate and got an honest "could be hours, I can't observe progress inside one transaction." Rewrote to load `patients`/`lab_exams`/`clinical_records` into memory **once each** (a handful of queries total) and do all matching in JS, then bulk-insert via `unnest()` in batches of 2,000 — the whole run (matching + insert) now takes seconds.
2. **The bulk-insert then failed on a `NOT NULL` violation on `created_at`/`updated_at`.** Assumed Sequelize's `defaultValue: Sequelize.NOW` in the migration meant a real Postgres column `DEFAULT` — it doesn't; it's an ORM-layer default applied by `Model.create()`, invisible to a raw `INSERT ... SELECT * FROM unnest(...)`. Confirmed via `information_schema.columns` (`column_default: null`) before fixing by passing explicit timestamp arrays. **This is a general trap, not specific to this script** — any raw-SQL bulk insert against a Sequelize-defined table needs to supply `created_at`/`updated_at` itself; the model-level default won't save you.
3. Both failures rolled back cleanly (single transaction) — verified `lab_exam_orders` was still empty before each retry.

`examenNoEncontrado: 3214` and `variasConsultasEnFecha: 2830` were skipped rather than guessed (some catalog codes from the legacy era didn't survive into today's `lab_exams`; some patients had more than one consultation on the exact same date, so the record couldn't be picked unambiguously).

## Promoted knowledge
- **Sequelize migration `defaultValue` is not a DB-level default** unless declared some other way — raw bulk inserts must supply timestamp columns explicitly. Worth remembering for any future bulk-import script in this codebase.
- Bulk-import pattern (load reference tables into memory once, match in JS, `unnest()`-based batched insert) is now the template for any future large legacy-data import — much cheaper than one-row-at-a-time round-trips, and resilient to a slow/flaky connection since it's a handful of queries instead of tens of thousands.

## Follow-ups
- [ ] `CONSULTA_2021_v2`'s own `ORDEN-EX.DAT` is still locked — if freed, the same extractor/import applies for the newer era's orders too.
