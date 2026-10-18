# Sincronización desde la laptop de la doctora

La doctora puede seguir usando VRunner. Para pasar lo nuevo a NexusDoc cierra VRunner y da doble clic en "Actualizar NexusDoc" en el escritorio. Decisión y alternativas: ADR 0003.

## Flujo

1. **Laptop** (`data/sync-laptop/`): busca la carpeta de VRunner en el escritorio (con `CONSULTA.DAT` y `PACIENTE.DAT`; excluye nombres con `2019`, `BACKUP` o `RESPALDO`). Comprueba que VRunner esté cerrado y corre los extractores de `data/scripts/analisis` con Node portable: ~1 min. Envía un JSON gzip (~1,2 MB) a `POST /api/legacy-sync` con `Authorization: Bearer <LEGACY_SYNC_TOKEN>` y consulta `GET /api/legacy-sync/:id` hasta que termina.
2. **Backend**: guarda el paquete en `LEGACY_SYNC_DIR/<runId>/` (conserva los últimos 5) y lanza `scripts/legacy-sync-run.js`.
3. **Runner**:
   - Frenos (`legacy-sync-guard.js`): rechaza si los nombres de las pacientes existentes coinciden menos del 90 % (otra carpeta, p. ej. la de 2019), si hay más de 300 pacientes nuevas o si hay más de 2.000 consultas nuevas. En esos casos no escribe nada y deja la corrida en `needs_review`.
   - Respaldo de las tablas, seguido de los pasos diferenciales de `data/docs/COMO-DESCIFRAR-DATOS.md` § 5: pacientes, nombres, cédula/teléfono, consultas, médicos, récipe/eco, citas, informes, órdenes, embarazos y campos extra.
   - Si un paso falla, se detiene y la corrida queda en `failed`.
4. Cada corrida queda en `legacy_sync_runs`: estado, plan, resultado de cada paso y log completo.

## Configuración (una vez)

- Backend (Dokploy): `LEGACY_SYNC_TOKEN` (32 bytes aleatorios en base64url) y `LEGACY_SYNC_DIR` apuntando a un volumen persistente. Sin el token, el endpoint responde 503.
- Paquete para la laptop, desde `data/`:
  `powershell -ExecutionPolicy Bypass -File sync-laptop\build-laptop-package.ps1 -Token <token>`
  Genera `sync-laptop/dist/NexusDocSync.zip` (~31 MB), ignorado por git porque contiene el token. En la laptop: copiar a `C:\NexusDocSync` y correr "Crear acceso en el escritorio.bat".

## Revisar una corrida

```sql
SELECT id, status, message, summary->'plan', created_at, finished_at FROM legacy_sync_runs ORDER BY created_at DESC LIMIT 5;
```

Para reintentar a mano: `node -r dotenv/config scripts/legacy-sync-run.js <LEGACY_SYNC_DIR>/<runId> <runId>`. Antes hay que poner la corrida en `running`.

## Límites conocidos

- Solo la era 2021, la carpeta que la doctora sigue usando. La historia 2019 ya está cargada y no cambia.
- El token solo sirve para subir un paquete y ver su estado. Si se pierde la laptop, hay que rotar `LEGACY_SYNC_TOKEN` y generar un paquete nuevo.
- `pacientes "Sin nombre" = 1` en la integridad es el paciente 1748, que ya existía; no frena la carga.
