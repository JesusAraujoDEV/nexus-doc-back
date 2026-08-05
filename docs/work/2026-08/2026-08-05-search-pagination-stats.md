# 2026-08-05 — Búsqueda/paginación de pacientes + endpoint de estadísticas

## What changed
`GET /api/patients` ahora acepta `?search=&page=&limit=` (ILIKE sobre nombre/apellido/cédula/teléfono, respuesta `{items,total,page,pages}`) y expone `visitsCount`/`lastVisit` por paciente. Se agregó `GET /api/stats/summary` (totales, consultas por mes, tipos de visita normalizados, distribución por edad) para el dashboard. Se desplegó a producción vía Dokploy.

## Why
El directorio de pacientes pasó de datos demo a 2.748 pacientes reales; devolver todo sin paginar ni buscar no es viable. El dashboard necesitaba métricas reales en vez de valores mock.

## How
`services/patient_service.js`: `findAndCountAll` con `buildSearchWhere` + subqueries de conteo. Nuevo trío `stats_service.js`/`stats_controller.js`/`stats_router.js` con SQL crudo agrupado, montado en `routes/index.js` bajo `/stats`. Sin migraciones (solo lectura).

## Promoted knowledge
None (comportamiento vive en el código de rutas/servicios; sin guía dedicada aún).

## Follow-ups
- [ ] `consultationsByMonth` agrupa por `created_at` (fecha de import), no por la fecha real de consulta — el texto de fecha real está en las consultas pero no se parseó a columna. Revisitar si se quiere tendencia temporal verídica.
