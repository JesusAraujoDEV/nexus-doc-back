# Aislamiento por doctor (IDOR) y endurecimiento de auth

## Problema

- `POST /auth/register` era público: cualquiera podía crearse un usuario.
- Los services buscaban por `findByPk(id)` sin filtrar por doctor. Con un usuario DOCTOR cualquiera y un UUID, se leían, editaban o borraban pacientes, consultas, embarazos, órdenes, informes y PDFs ajenos (IDOR: acceso directo por id sin autorización).

## Cambios

- `/auth/register` exige JWT con rol ADMIN. `/auth/login` con limitador (10 intentos fallidos / 15 min por IP).
- `services/ownership_service.js`: toda búsqueda por id filtra `{ id, doctorId }` del usuario autenticado y responde 404 si no es suyo. `general_ultrasounds` hereda el dueño de su consulta.
- Los controllers pasan `req.user.sub` a todos los métodos (antes solo en create/list/trash). La papelera restaura solo lo propio.
- En create se valida que la paciente, la consulta y el embarazo enlazados sean del doctor y de la misma paciente. El informe deriva `patientId` de la consulta.
- PATCH ignora `id`, `doctorId`, `patientId` (y `clinicalRecordId` en informes): no se re-asignan registros.
- `pregnancy_service.update` ya no muta el body del request.
- PDFs de consulta movidos a `services/clinical_record_pdf_service.js` (límite de 200 líneas por service).
- `POST /appointments` (público, landing): limitador de 5 por IP por hora; el servicio y la paciente deben ser del doctor indicado.
- Error handler sin stack en producción; `server.js` ya no imprime `DB_URL`; `trust proxy` para que el limitador vea la IP real.
- `createPatientSchema`: cédula y teléfono opcionales. El conteo y la última visita del directorio ignoran consultas en papelera.

## Verificación

- `node -r dotenv/config scripts/check-ownership-isolation.js`: solo lectura, bloquea cualquier escritura. 29 operaciones del doctor A responden 404 a un doctor B simulado; el doctor A sigue viendo lo suyo. `gu.remove` y `appointment.updateStatus` no se probaron porque esas tablas están vacías.
- `scripts/smoke-clinical-records.js` OK.

## Pendiente

- Catálogos (centros, fármacos, exámenes, médicos referidos) son globales, sin `doctor_id`. Con una sola doctora no es un problema; si se suma otra, hay que decidir si se comparten.
- `libs/sequelize.js` usa `ssl:false` en producción: cambiarlo requiere confirmar que la base acepta SSL.
