# Adjuntos de consulta en Cloudflare R2

Fotos y archivos de cada consulta se guardan en un bucket **privado** de Cloudflare R2. Nadie los ve con un enlace: el navegador los pide al backend con el JWT y el backend los lee de R2.

## Configurar (una vez)

1. Entrar a <https://dash.cloudflare.com> → **R2 Object Storage**. La primera vez pide activar el plan (incluye 10 GB gratis por mes; pide tarjeta pero no cobra dentro de ese límite).
2. **Create bucket** → nombre `nexusdoc-adjuntos`, ubicación automática. No activar "Public access" ni dominio público.
3. En la página de R2, copiar el **Account ID** (columna derecha).
4. **Manage R2 API Tokens** → **Create API token**:
   - Permisos: **Object Read & Write**.
   - Alcance: **Apply to specific buckets only** → `nexusdoc-adjuntos`.
   - TTL: sin vencimiento (o rotarlo a mano cada año).
5. Copiar **Access Key ID** y **Secret Access Key**. El secreto se muestra una sola vez.
6. Cargar en el `.env` del backend (local y en Dokploy):

```
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key id>
R2_SECRET_ACCESS_KEY=<secret access key>
R2_BUCKET=nexusdoc-adjuntos
```

Sin estas variables, subir un archivo responde 503 y el resto de la app funciona igual.

## Cómo funciona

| Endpoint | Qué hace |
|----------|----------|
| `POST /api/files/record/:recordId` | Sube un archivo (`multipart/form-data`, campo `file`) a una consulta |
| `GET /api/files/record/:recordId` | Lista los adjuntos de una consulta |
| `GET /api/files/patient/:patientId` | Lista todos los adjuntos de una paciente |
| `GET /api/files/:id/content` | Devuelve el archivo (imagen y PDF se muestran, el resto se descarga) |
| `PATCH /api/files/:id` | Renombra (`{ fileName }`) |
| `DELETE /api/files/:id` | Borrado lógico (va a la papelera; el objeto sigue en R2) |
| `GET /api/files/trash`, `POST /api/files/:id/restore` | Papelera |

- Tipos aceptados, detectados por los primeros bytes del archivo (no por la extensión): JPG, PNG, WEBP, PDF, Word `.docx`, Excel `.xlsx`.
- Límites: 15 MB por imagen, 25 MB por documento.
- Las fotos se re-codifican en el servidor: se aplica la rotación y se borran los metadatos EXIF (GPS, modelo del teléfono).
- HEIC del iPhone no se acepta: en el iPhone, Ajustes → Cámara → Formatos → "Más compatible". Safari suele convertir a JPG al subir desde la galería.
- La clave en R2 es `doctors/<doctorId>/<uuid>.<ext>`: no contiene nombre de paciente.
- Cada acceso exige que el archivo sea del doctor autenticado (ver ADR 0002).

## Pendiente

- Copia de respaldo del bucket a otro proveedor (Backblaze B2 con `rclone sync`, programado).
- Purga definitiva de objetos borrados hace más de N días.

Verificación local sin red: `node scripts/check-file-inspect.js`.
