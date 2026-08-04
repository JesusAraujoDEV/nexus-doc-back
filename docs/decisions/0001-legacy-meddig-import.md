# 0001 — Extend patients/clinical_records schema for legacy MedDig import

- **Status**: Accepted
- **Date**: 2026-08-04
- **Owner role**: data-architect
- **Affects**: db/models/patient_model.js, db/models/clinical_record_model.js, db/migrations/

## Context

The clinic's ~20 years of patient history lives in a proprietary MedDig/VRunner binary database that is being decommissioned. That history was reverse-engineered into JSON (name, address, allergies, surgical history, habits, and free-text consultation notes) but the current schema has no columns for address/allergies/surgical history/habits, and requires `cedula`, `phone`, `birth_date` (patients) and `symptoms`/`diagnosis`/`treatment`/`private_notes` (clinical_records) NOT NULL — fields the legacy extraction cannot fully populate (cedula and birth_date were not recoverable in bulk; some historical consultations have blank diagnosis/treatment).

## Decision

Add nullable columns to carry the legacy fields the schema didn't have a place for, and relax the NOT NULL constraints that historical records can't satisfy, via a single additive migration (`20260804125000-legacy-import-fields.js`).

`patients` gains: `address`, `allergies`, `surgical_history`, `habits`, `legacy_notes` (all TEXT, nullable), `legacy_record_id` (INTEGER, unique, nullable — traces back to the original MedDig record id for future backfill of cedula/birth_date as patients are seen again). `cedula`, `phone`, `birth_date` become nullable.

`clinical_records` gains `visit_type` (STRING, nullable) and `legacy_record_id` (INTEGER, nullable). `symptoms`, `diagnosis`, `treatment`, `private_notes` become nullable.

## Considered alternatives

- **Separate `legacy_patients` staging table, migrate into `patients` manually later** — rejected: doubles the data model for no benefit, since the target shape is otherwise identical to `patients`.
- **Only import patients with complete required fields, drop the rest** — rejected: would discard the vast majority of the historical record on data we already have permission to keep (see project data-handling decision to keep this local/private).
- **Fabricate placeholder cedula/birth_date to satisfy NOT NULL** — rejected: inventing identity data for real patients is worse than leaving it null; nullable + backfill-on-next-visit is the honest option.

## Consequences

- **Positive**: full historical record (2,733 patients, 6,665 consultations) becomes queryable in the product's real schema instead of living only in flat JSON files.
- **Negative**: `patients`/`clinical_records` now carry nullable columns the live app must treat as optional (UI empty states, no assumption of completeness for legacy-imported rows).
- **Neutral**: `legacy_record_id` is import-only metadata; no current route reads it.

## Migration notes

Migration is additive/backward-compatible (no data loss on `up`); `down` reverses column-by-column. Existing empty tables in production — this ships before any live traffic, so no backfill script is needed for already-existing rows.
