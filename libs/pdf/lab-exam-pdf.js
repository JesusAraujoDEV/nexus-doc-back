const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');

const MARGIN = 40;
const WIDTH = 515;

function seccionTitulo(doc, texto, x, y, width) {
    doc.fontSize(10).font('Helvetica-Bold').text(texto, x, y, { width });
    y += 14;
    doc.moveTo(x, y).lineTo(x + width, y).stroke();
    return y + 8;
}

/** Genera el informe de "Lab. exámenes" de una consulta: lo solicitado y lo resultado en ella. Devuelve un Buffer. */
function buildLabExamPdf({ doctor, patient, record, orders }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = drawLetterhead(doc, doctor, MARGIN, MARGIN, 260);
        doc.fontSize(13).font('Helvetica-Bold').text('EXÁMENES DE LABORATORIO', MARGIN, MARGIN, { width: WIDTH, align: 'right' });
        doc.fontSize(9).font('Helvetica').text(`Fecha: ${formatearFecha(record.visitDate)}`, MARGIN, MARGIN + 18, { width: WIDTH, align: 'right' });
        doc.fontSize(9).text(`Paciente: ${patient.firstName} ${patient.lastName}`, MARGIN, MARGIN + 32, { width: WIDTH, align: 'right' });
        y = Math.max(y, MARGIN + 55) + 10;

        const solicitados = (orders || []).filter((o) => o.orderedRecordId === record.id);
        const resultados = (orders || []).filter((o) => o.resultRecordId === record.id);

        y = seccionTitulo(doc, 'Exámenes solicitados en esta consulta', MARGIN, y, WIDTH);
        if (!solicitados.length) {
            doc.fontSize(9).font('Helvetica-Oblique').text('Sin exámenes solicitados.', MARGIN, y);
            y = doc.y + 10;
        } else {
            doc.fontSize(9).font('Helvetica');
            for (const o of solicitados) {
                doc.text(`- ${o.exam.name}`, MARGIN, y, { width: WIDTH });
                y = doc.y + 2;
            }
            y += 8;
        }

        y = seccionTitulo(doc, 'Resultados registrados en esta consulta', MARGIN, y, WIDTH);
        if (!resultados.length) {
            doc.fontSize(9).font('Helvetica-Oblique').text('Sin resultados registrados.', MARGIN, y);
            y = doc.y + 10;
        } else {
            for (const o of resultados) {
                doc.fontSize(9).font('Helvetica-Bold').text(o.exam.name, MARGIN, y, { width: WIDTH });
                y = doc.y + 2;
                doc.fontSize(8).font('Helvetica');
                if (o.performedDate) { doc.text(`Fecha: ${o.performedDate}`, MARGIN + 10, y, { width: WIDTH - 10 }); y = doc.y + 1; }
                if (o.resultValue) { doc.text(`Valor: ${o.resultValue}`, MARGIN + 10, y, { width: WIDTH - 10 }); y = doc.y + 1; }
                if (o.resultObservations) { doc.text(`Observaciones: ${o.resultObservations}`, MARGIN + 10, y, { width: WIDTH - 10 }); y = doc.y + 1; }
                y += 8;
            }
        }

        drawSignatureBlock(doc, doctor, MARGIN + WIDTH - 220, 740, 220);

        doc.end();
    });
}

module.exports = { buildLabExamPdf };
