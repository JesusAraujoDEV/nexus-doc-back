const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo.jpg');

// El logo es un lienzo cuadrado (1024x1024) con harto margen en blanco alrededor
// del isotipo real; a este tamaño (100x100) el texto ya no queda debajo del
// dibujo. El logo ya trae el nombre y la especialidad escritos adentro, así
// que abajo solo van los datos que NO están en la imagen (dirección, teléfonos, RIF/MPPS/CM).
const LOGO_SIZE = 100;

/** Encabezado con logo + datos del médico. Devuelve la posición Y donde sigue el contenido. */
function drawLetterhead(doc, doctor, x, y, width) {
    const letterhead = doctor.letterhead || {};
    doc.image(LOGO_PATH, x, y, { width: Math.min(width, LOGO_SIZE) });
    let textY = y + LOGO_SIZE + 8;
    doc.fontSize(9).font('Helvetica');
    if (letterhead.address) { doc.text(letterhead.address, x, textY, { width }); textY += 12; }
    const telefonos = [doctor.phone, letterhead.secondaryPhone].filter(Boolean).join(', ');
    if (telefonos) { doc.text(`Tlf: ${telefonos}`, x, textY, { width }); textY += 12; }
    const ids = [letterhead.rif && `RIF ${letterhead.rif}`, letterhead.mpps && `MPPS ${letterhead.mpps}`, letterhead.cm && `CM ${letterhead.cm}`]
        .filter(Boolean).join(' / ');
    if (ids) { doc.text(ids, x, textY, { width }); textY += 12; }
    return textY + 6;
}

/** Línea en blanco para firma/sello + nombre y credenciales del médico debajo, como en los PDF originales. */
function drawSignatureBlock(doc, doctor, x, y, width) {
    const letterhead = doctor.letterhead || {};
    doc.moveTo(x, y).lineTo(x + width, y).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text(`Dra. ${doctor.firstName} ${doctor.lastName}`, x, y + 4, { width, align: 'center' });
    const cred = [letterhead.rif && `C.I ${letterhead.rif}`, letterhead.mpps && `MPPS ${letterhead.mpps}`, letterhead.cm && `CM ${letterhead.cm}`]
        .filter(Boolean).join(' / ');
    if (cred) doc.font('Helvetica').text(cred, x, y + 16, { width, align: 'center' });
}

function formatearFecha(fecha) {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const d = fecha ? new Date(fecha) : new Date();
    return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

module.exports = { drawLetterhead, drawSignatureBlock, formatearFecha };
