# 0002 — Autorizar cada recurso por doctor dentro de los services

- **Status**: Accepted
- **Date**: 2026-10-17
- **Owner role**: system-architect (con security-compliance)
- **Affects**: services, controllers

## Context

Los services cargaban recursos con `findByPk(id)` sin comprobar de qué doctor eran. Cualquier usuario con rol DOCTOR podía leer o modificar historias ajenas conociendo el UUID (IDOR).

## Decision

Toda carga de un recurso por id pasa por `services/ownership_service.js`, que filtra por `{ id, doctorId }` del usuario autenticado y responde 404 si no coincide.

Los controllers pasan `req.user.sub` a cada método. Los recursos sin `doctor_id` propio (`general_ultrasounds`) heredan el dueño de su consulta por JOIN. En create se valida que las referencias (paciente, consulta, embarazo) sean del mismo doctor y de la misma paciente. Se responde 404 y no 403 para no confirmar que el id existe.

## Considered alternatives

- **Middleware que carga y autoriza antes del controller** — Rechazado: duplica la consulta y tiene que conocer cada modelo y sus relaciones.
- **Row Level Security de Postgres** — Rechazado: excesivo para una sola instancia con un doctor; exige pasar el doctor por sesión de base en cada request.

## Consequences

- **Positive**: un solo punto que revisar. `scripts/check-ownership-isolation.js` lo verifica contra la base real sin escribir.
- **Negative**: un método nuevo que olvide usar `OwnershipService` reabre el hueco. No hay lint que lo detecte.
- **Neutral**: una consulta extra a `doctors` por request (resolver el doctor del usuario).
