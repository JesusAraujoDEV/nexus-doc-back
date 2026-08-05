# Pendientes de implementación

## 1. Almacenamiento de imágenes en Drive

**Qué:** Conectar un servicio de almacenamiento (Google Drive, S3, o similar) para guardar las imágenes clínicas (ecografías, fotos de lesiones, resultados escaneados). Serán muchas imágenes a lo largo del tiempo.

**Requisitos:**
- La carpeta/bucket debe ser pública a nivel de enlace (para que la app pueda mostrar las imágenes sin auth adicional) pero no indexada ni descubrible — solo quien tenga el URL puede verlas.
- Solo yo (el admin) sabe dónde está el storage real.
- Vincular cada imagen a un `clinical_record` y/o `patient` (la tabla `patient_files` ya existe con `file_url`, `file_name`, `file_type`).
- Subida desde el frontend: en la consulta o en el perfil del paciente.
- Pensar en compresión/resize antes de subir (las fotos del teléfono pesan 5-10MB cada una).

**Decisiones pendientes:**
- ¿Google Drive (gratis 15GB, API OAuth) vs Cloudflare R2 (gratis 10GB, compatible S3, sin egress) vs Backblaze B2?
- ¿Generar URLs firmadas con expiración o dejar públicas permanentes?
- Organización: ¿una carpeta por paciente? ¿por año? ¿flat con UUID como nombre?

---

## 2. Validar la lógica de horarios (agenda)

**Qué:** Hay código abandonado de disponibilidad y citas (`appointments`, `availability_service.js`, `availability_router.js`) que nunca se terminó de conectar con el frontend ni se validó contra el flujo real de la doctora.

**Tareas:**
- Revisar qué endpoints existen y si funcionan (`GET/POST /availability`, `GET/POST /appointments`).
- Definir con mamá: ¿cuántos pacientes por día? ¿Bloques de cuántos minutos? ¿Trabaja todos los días? ¿Tiene horarios distintos por centro médico?
- Decidir si la agenda es solo interna (ella ve su día) o si las pacientes pueden agendar online.
- Validar: ¿qué pasa con los conflictos? ¿Se puede tener dos citas al mismo horario?
- Frontend: vista de calendario/agenda.

---

## 3. Generación de PDFs (récipes, órdenes de examen, constancias)

**Qué:** En MedDig/VRunner la doctora generaba documentos impresos que la paciente se llevaba a la farmacia o al laboratorio. Necesitamos replicar esa funcionalidad: generar un PDF desde la app y que la paciente se lo lleve (impreso o por WhatsApp).

**Documentos a revisar con mamá:**
- **Récipe médico** — lista de medicamentos con posología, membrete de la doctora, firma digital, fecha. Probablemente el más urgente.
- **Orden de examen de laboratorio** — lista de exámenes indicados, datos de la paciente.
- **Constancia médica** — reposo, certificado de embarazo, etc.
- **Informe médico** — resumen de la historia clínica para referir a otro especialista.
- **Referencia** — cuando envía a la paciente a otro médico.

**Preguntas para mamá:**
- ¿Cómo era el formato en VRunner? ¿Tenía membrete, logo, datos del MPPS/CM?
- ¿Qué datos lleva cada documento exactamente?
- ¿Los firma digitalmente o los imprime y firma a mano?
- ¿Los manda por WhatsApp a la paciente o solo los imprime?
- ¿Hay alguno que ya no use y podamos saltar?

**Implementación probable:**
- Librería de generación de PDF en el backend (puppeteer, pdfkit, o jsPDF en el front).
- Templates HTML → PDF con los datos de la consulta.
- Botón en cada consulta: "Generar récipe", "Generar orden de examen".
- Guardar el PDF generado en el storage de imágenes (punto 1) para histórico.

---

## Prioridad sugerida

1. **PDFs** — es lo que la doctora necesita para atender pacientes HOY (sin récipe impreso no puede recetar)
2. **Imágenes** — complementa la historia clínica, pero puede esperar
3. **Horarios** — nice to have, la doctora puede seguir manejando la agenda por WhatsApp mientras tanto
