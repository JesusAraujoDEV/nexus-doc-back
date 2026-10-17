const boom = require('@hapi/boom');
const sharp = require('sharp');

const MB = 1024 * 1024;
const IMAGE_MAX = 15 * MB;
const DOC_MAX = 25 * MB;

// El tipo se decide por los primeros bytes (magic bytes), nunca por la
// extensión ni por el Content-Type que manda el navegador.
const SIGNATURES = [
  { mime: 'image/jpeg', kind: 'IMAGE', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', kind: 'IMAGE', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', kind: 'IMAGE', ext: 'webp', test: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { mime: 'application/pdf', kind: 'PDF', ext: 'pdf', test: (b) => b.toString('ascii', 0, 5) === '%PDF-' },
];

// Word y Excel modernos son ZIP: se aceptan solo con esa firma Y esa extensión.
const OFFICE = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function isHeic(buffer) {
  const brand = buffer.toString('ascii', 8, 12);
  return buffer.toString('ascii', 4, 8) === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1', 'hevc'].includes(brand);
}

function detect(buffer, originalName) {
  const match = SIGNATURES.find((s) => s.test(buffer));
  if (match) return match;
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (isZip && OFFICE[ext]) return { mime: OFFICE[ext], kind: 'OTHER', ext };
  if (isHeic(buffer)) {
    throw boom.unsupportedMediaType('Las fotos HEIC del iPhone no se aceptan todavía. En el iPhone: Ajustes > Cámara > Formatos > "Más compatible".');
  }
  throw boom.unsupportedMediaType('Tipo de archivo no permitido. Se aceptan JPG, PNG, WEBP, PDF, Word (.docx) y Excel (.xlsx).');
}

/**
 * Re-codifica la imagen: aplica la rotación EXIF y descarta TODOS los
 * metadatos (EXIF, GPS, modelo del teléfono). sharp no copia metadatos salvo
 * que se pida con withMetadata().
 */
async function sanitizeImage(buffer, type) {
  const pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  if (type.mime === 'image/png') return pipeline.png().toBuffer();
  if (type.mime === 'image/webp') return pipeline.webp({ quality: 90 }).toBuffer();
  return pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

/** Valida tipo y tamaño, y limpia metadatos de imágenes. Devuelve el buffer listo para subir. */
async function inspectUpload(file) {
  if (!file || !file.buffer || file.buffer.length === 0) throw boom.badRequest('No se recibió ningún archivo');
  const type = detect(file.buffer, file.originalname || '');
  const max = type.kind === 'IMAGE' ? IMAGE_MAX : DOC_MAX;
  if (file.buffer.length > max) {
    throw boom.entityTooLarge(`El archivo supera el máximo de ${max / MB} MB`);
  }
  const buffer = type.kind === 'IMAGE' ? await sanitizeImage(file.buffer, type) : file.buffer;
  return { buffer, ...type };
}

module.exports = { inspectUpload, DOC_MAX };
