/**
 * Verifica la validación de adjuntos sin red ni base: tipos por magic bytes,
 * rechazo de lo no permitido y que las imágenes salgan sin EXIF/GPS.
 *
 * Uso: node scripts/check-file-inspect.js
 */
const sharp = require('sharp');
const { inspectUpload } = require('../libs/storage/file-inspect');

async function jpegWithExif() {
  return sharp({ create: { width: 40, height: 20, channels: 3, background: '#c33' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'TelefonoX', Model: 'Modelo-123' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '10/1 30/1 0/1' } })
    .toBuffer();
}

async function expectReject(name, file, status) {
  try {
    await inspectUpload(file);
    return `✗ ${name}: se aceptó`;
  } catch (err) {
    const ok = err.isBoom && err.output.statusCode === status;
    return `${ok ? '✓' : '✗'} ${name}: ${err.isBoom ? err.output.statusCode : err.message}`;
  }
}

async function main() {
  const results = [];
  const original = await jpegWithExif();
  const before = await sharp(original).metadata();
  const out = await inspectUpload({ buffer: original, originalname: 'foto.png' });
  const after = await sharp(out.buffer).metadata();
  results.push(`${before.exif && !after.exif ? '✓' : '✗'} JPEG con EXIF -> sin EXIF (antes ${before.exif ? 'sí' : 'no'}, después ${after.exif ? 'sí' : 'no'}), mime=${out.mime}`);

  const pdf = Buffer.from('%PDF-1.4\n%fake\n');
  const pdfOut = await inspectUpload({ buffer: pdf, originalname: 'informe.pdf' });
  results.push(`${pdfOut.kind === 'PDF' && pdfOut.buffer === pdf ? '✓' : '✗'} PDF pasa intacto`);

  results.push(await expectReject('ejecutable renombrado a .pdf', { buffer: Buffer.from('MZ\x90\x00binario'), originalname: 'x.pdf' }, 415));
  results.push(await expectReject('zip renombrado a .pdf', { buffer: Buffer.from('PK\x03\x04resto'), originalname: 'x.pdf' }, 415));
  const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(16)]);
  results.push(await expectReject('HEIC', { buffer: heic, originalname: 'IMG_1.HEIC' }, 415));
  results.push(await expectReject('vacío', { buffer: Buffer.alloc(0), originalname: 'x.jpg' }, 400));
  const bigImg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(16 * 1024 * 1024)]);
  results.push(await expectReject('imagen de 16 MB', { buffer: bigImg, originalname: 'x.jpg' }, 413));

  results.forEach((r) => console.log(r));
  const ok = results.every((r) => r.startsWith('✓'));
  console.log(ok ? '\nOK' : '\nFALLAS');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
