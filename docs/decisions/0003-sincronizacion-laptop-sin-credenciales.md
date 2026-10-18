# 0003 — Sincronizar VRunner desde la laptop sin credenciales de base

- **Status**: Accepted
- **Date**: 2026-10-18
- **Owner role**: system-architect (con security-compliance)
- **Affects**: routes/legacy-sync, scripts de carga legacy, data/sync-laptop

## Context

La doctora sigue usando VRunner en su laptop. Pasar los datos implicaba pendrive, Drive y una migración manual. Ella necesita un doble clic, y la laptop no tiene nada instalado.

## Decision

La laptop descifra los datos (Node portable + extractores) y envía un paquete JSON por HTTPS a `POST /api/legacy-sync` con un token que solo permite subir. El servidor aplica frenos, hace un respaldo y corre la carga diferencial idempotente existente.

## Considered alternatives

- **Todo en la laptop con `DB_URL`**: era más simple. Se rechazó porque deja la contraseña de producción en una laptop que puede perderse y obliga a exponer Postgres a internet.
- **Subir la carpeta cruda (2,2 GB) y descifrar en el servidor**: se rechazó porque es lento con el internet de la consulta y el servidor necesitaría hasta 12 GB de RAM para `ORDEN-EX.DAT`.

## Consequences

- **Positive**: la laptop no puede leer historias. Cada carga queda registrada en `legacy_sync_runs`, con respaldo previo.
- **Negative**: los extractores corren en la laptop, así que una corrección en `data/scripts/analisis` exige regenerar el paquete y copiarlo a la laptop.
- **Neutral**: los scripts de carga aceptan `LEGACY_DATA_DIR` / `LEGACY_EXTRAS_ERAS` / `LEGACY_BACKUP_DIR` para trabajar sobre un paquete.
