const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');
const { etiqueta } = require('./ultrasound-labels');

const MARGIN = 40;
const WIDTH = 515;

/** Genera el informe de "Exploración por Ultrasonidos" de una consulta. Devuelve un Buffer. */
function buildUltrasoundPdf({ doctor, patient, record }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = drawLetterhead(doc, doctor, MARGIN, MARGIN, 260);
        doc.fontSize(13).font('Helvetica-Bold').text('EXPLORACIÓN POR ULTRASONIDOS', MARGIN, MARGIN, { width: WIDTH, align: 'right' });
        doc.fontSize(9).font('Helvetica').text(`Fecha: ${formatearFecha(record.visitDate)}`, MARGIN, MARGIN + 18, { width: WIDTH, align: 'right' });

        y = Math.max(y, MARGIN + 40) + 10;
        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 10;

        doc.fontSize(10).font('Helvetica-Bold').text('Paciente', MARGIN, y);
        doc.font('Helvetica').text(`${patient.firstName} ${patient.lastName}   C.I ${patient.cedula || 's/d'}`, MARGIN, y + 14);
        y += 34;

        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 12;

        const eco = record.ultrasoundFindings || {};
        doc.fontSize(11).font('Helvetica-Bold').text('Hallazgos', MARGIN, y);
        y += 18;
        doc.fontSize(9).font('Helvetica');
        for (const [clave, valor] of Object.entries(eco)) {
            const linea = `${etiqueta(clave)}: ${valor}`;
            doc.text(linea, MARGIN, y, { width: WIDTH });
            y += doc.heightOfString(linea, { width: WIDTH }) + 4;
        }

        if (!Object.keys(eco).length) {
            doc.font('Helvetica-Oblique').text('Sin hallazgos registrados.', MARGIN, y);
        }

        // Espacio en blanco para firma/sello a mano, abajo a la derecha, como en el informe original.
        drawSignatureBlock(doc, doctor, MARGIN + WIDTH - 220, 740, 220);

        doc.end();
    });
}

module.exports = { buildUltrasoundPdf };
