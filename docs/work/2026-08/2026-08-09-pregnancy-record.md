# 2026-08-09 — Ficha de Embarazo (pregnancy record) backend

## What changed
Added a `Pregnancy` entity (`pregnancies` table) linked to `clinical_records` via a new `pregnancy_id` FK and a `category` column (`gynecology` | `obstetrics`). Full CRUD service/controller/routes, F.U.M (last menstrual period) resolution supporting both a reported date and an estimated one (ultrasound reference date + gestational weeks/days, "fecha incierta"), live-computed gestational age and F.P.P (Naegele's rule, never persisted), a PDF export reusing the existing letterhead pattern, and a `pregnant=true` patient-list filter backed by a partial-unique-index-enforced "one active pregnancy per patient" invariant. Backfilled `category='obstetrics'` on ~8,252 historical `clinical_records` rows whose `ultrasound_findings` contain obstetric-only MedDig fields.

## Why
Dra. Arteaga's real workflow (VRunner) treats an obstetric consultation as implying pregnancy: it tracks a single evolving pregnancy record across many consultations, computes gestational age/due date from F.U.M, and lets F.U.M itself be derived from an ultrasound when the patient doesn't know her last period. The prior system had no equivalent — obstetric data lived only inside individual consultation records with no way to see "is this patient currently pregnant" or a consolidated pregnancy history.

## How
- `crew:data-architect` was consulted for the schema before implementation (partial unique index for the "one active pregnancy" invariant; JSONB `newborn_data` for the finalized/delivery fields, following the project's existing JSONB-for-flexible-data convention).
- `libs/pregnancy-calc.js` is the single source of truth for the date math (`estimateLmpDate`, `dueDate`, `gestationalAgeToday`), UTC-safe to avoid the timezone-off-by-one bug class already fixed elsewhere in this codebase.
- `services/pregnancy_service.js` attaches computed fields (`gestationalAgeWeeks/Days`, `dueDate`, `lmpExplanation`) at read time only — nothing computed is stored.
- Verified end-to-end against production data (real patient, real VRunner screenshot) before commit: created a pregnancy via the API with `lmpSource:"estimated"` and got an exact match to VRunner's own calculated gestational age and F.P.P.

## Promoted knowledge
None — the computed-not-stored and UTC-safe-date patterns already existed as conventions in this codebase; this feature follows them rather than introducing new ones.

## Follow-ups
- [ ] No UI trigger yet for deleting a whole Ficha de Embarazo (the `deletePregnancy` API exists, unused).
- [ ] Deleting a linked obstetric consultation reuses the generic consultation-delete flow — not yet verified specifically in the pregnancy-card context.
- [ ] Full browser-based end-to-end test of the flow is still pending (no interactive browser available when this shipped).
