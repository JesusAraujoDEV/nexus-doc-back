# 2026-08-17 — Endpoints para calendario, labs por paciente y filtros ampliados de pacientes

## What changed
Tres endpoints nuevos/ampliados, cada uno soporte de una iniciativa de frontend construida en paralelo por subagentes `crew:frontend-architect`:
- `patient-search.js`/`patient_service.js`/`patient_controller.js`/`patient_schema.js`: el filtro `pregnant` en `GET /patients` gana un segundo modo `history` (cualquier embarazo alguna vez, vía `EXISTS`, sin importar estado) junto al `true` existente (embarazo activo); nuevo filtro `labsPending=true` (`EXISTS` sobre `lab_exam_orders` con `result_value IS NULL`).
- `clinical_record_controller.js`/`clinical_record_service.js`/`clinical_record_router.js`/`clinical_record_schema.js`: nuevo `GET /clinical-records/calendar?from&to`, consultas del doctor logueado en un rango de fechas.
- `lab_exam_order_controller.js`/`lab_exam_order_service.js`/`lab_exam_order_router.js`: nuevo `GET /lab-exam-orders/patient/:patientId`, historial completo (pendientes + con resultado) de un paciente — antes solo existía el filtro de pendientes.

## Why
El usuario pidió una revisión de frontend en bloque (calendario en sidebar, perfil de paciente en pestañas, catálogo actualizado, filtros mejorados) y reportó una posible confusión con el filtro de embarazadas (el modo "historial" que recordaba nunca había existido — se confirmó que no había bug activo, solo la funcionalidad faltaba). Cada endpoint es el soporte mínimo de backend que el frontend correspondiente necesitaba y que no existía todavía.

## How
Los tres siguen el patrón de capas ya establecido (route → middleware auth/validación Joi → controller → service → modelo) y reusan patrones existentes en vez de inventar nuevos: `EXISTS` (nunca `INNER JOIN`) para los filtros booleanos sobre relaciones 1-a-N, y `COALESCE(visit_date, created_at::date)` (ya usado en `patient-search.js` para "última visita") como fecha real de cada consulta en el endpoint de calendario. Se evaluó el módulo `Appointment` (citas futuras) como fuente para el calendario y se descartó — el pedido era ver consultas ya tenidas, no agendar.

## Promoted knowledge
Ninguno nuevo — se aplicaron convenciones ya vigentes (EXISTS sobre relaciones, COALESCE de fecha real, capas route→controller→service).

## Follow-ups
- [ ] Filtro "referido por médico" quedó evaluado y descartado por ahora (requiere un picker async y un round-trip de catálogo nuevo) — no implementado.
- [ ] `doctor_id` en `clinical_records` no tiene índice propio; se dejó así deliberadamente por bajo volumen de una sola clínica, agregar si el volumen lo justifica.
- [ ] Ningún endpoint fue probado end-to-end contra la app real logueada (los agentes no tenían credenciales) — solo build/lint limpios y, en el caso del calendario, un JWT firmado localmente contra la base real.
