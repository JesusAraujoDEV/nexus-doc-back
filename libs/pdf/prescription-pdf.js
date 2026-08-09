const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');

const COL_WIDTH = 260;
const COL_X = [40, 320];

/** Una columna del récipe (se dibuja dos veces: "R.p." para farmacia, "Indicaciones" para la paciente). */
function drawColumn(doc, { titulo, doctor, patient, record, x }) {
    let y = drawLetterhead(doc, doctor, x, 40, COL_WIDTH);
    doc.fontSize(11).font('Helvetica-BoldOblique').text(`${titulo}:`, x, y);
    y += 20;

    doc.fontSize(8).font('Helvetica');
    doc.text(`Fecha de emisión: ${formatearFecha(record.visitDate)}`, x, y, { width: COL_WIDTH });
    y += 22;

    doc.font('Helvetica').fontSize(9);
    for (const item of record.recipeItems || []) {
        doc.font('Helvetica-Bold').text(`- (${item.nombre || 'Indicación'})`, x, y, { width: COL_WIDTH });
        y += 12;
        if (item.posologia) {
            doc.font('Helvetica').text(item.posologia, x, y, { width: COL_WIDTH });
            y += doc.heightOfString(item.posologia, { width: COL_WIDTH }) + 4;
        } else {
            y += 4;
        }
    }

    // Espacio en blanco para firma/sello a mano antes del pie con los datos de la paciente.
    drawSignatureBlock(doc, doctor, x + 30, 700, COL_WIDTH - 60);

    const pieY = 760;
    doc.fontSize(9).font('Helvetica-Bold').text(`Paciente: ${patient.firstName} ${patient.lastName}`, x, pieY, { width: COL_WIDTH });
    doc.font('Helvetica').text(`C.I ${patient.cedula || 's/d'}`, x, pieY + 12, { width: COL_WIDTH });
    if (patient.birthDate) doc.text(`Fecha de Nacimiento: ${patient.birthDate}`, x, pieY + 24, { width: COL_WIDTH });
}

/** Genera el PDF del récipe/indicaciones de una consulta. Devuelve un Buffer. */
function buildPrescriptionPdf({ doctor, patient, record }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        drawColumn(doc, { titulo: 'R.p.', doctor, patient, record, x: COL_X[0] });
        drawColumn(doc, { titulo: 'Indicaciones', doctor, patient, record, x: COL_X[1] });

        doc.end();
    });
}

module.exports = { buildPrescriptionPdf };
