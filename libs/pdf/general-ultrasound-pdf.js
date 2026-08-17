const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');
const { SUB_TYPE_FIELDS, SUB_TYPE_LABELS, etiqueta } = require('./general-ultrasound-labels');

const MARGIN = 40;
const WIDTH = 515;
const LABEL_WIDTH = 180;

function fila(doc, etiquetaTexto, valor, x, y, width) {
    if (valor === undefined || valor === null || valor === '') return y;
    const altura = Math.max(
        doc.heightOfString(`${etiquetaTexto}:`, { width: LABEL_WIDTH }),
        doc.heightOfString(String(valor), { width: width - LABEL_WIDTH }),
    );
    doc.fontSize(8).font('Helvetica-Bold').text(`${etiquetaTexto}:`, x, y, { width: LABEL_WIDTH });
    doc.font('Helvetica').text(String(valor), x + LABEL_WIDTH, y, { width: width - LABEL_WIDTH });
    return y + Math.max(15, altura) + 3;
}

/** Una sección por subtipo con hallazgos, en el mismo orden en que el formulario los presenta. */
function drawSubTypeSection(doc, subType, findings, x, y, width) {
    doc.fontSize(10).font('Helvetica-Bold').text(SUB_TYPE_LABELS[subType] || subType, x, y, { width });
    y += 14;
    doc.moveTo(x, y).lineTo(x + width, y).stroke();
    y += 8;

    const orden = SUB_TYPE_FIELDS[subType] || Object.keys(findings);
    for (const campo of orden) {
        if (!(campo in findings)) continue;
        y = fila(doc, etiqueta(campo), findings[campo], x, y, width);
    }
    return y + 10;
}

/** Genera el informe de "Ultrasonido general" de una consulta: una sección por subtipo con hallazgos guardados. Devuelve un Buffer. */
function buildGeneralUltrasoundPdf({ doctor, patient, record, generalUltrasounds }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = drawLetterhead(doc, doctor, MARGIN, MARGIN, 260);
        doc.fontSize(13).font('Helvetica-Bold').text('ULTRASONIDO GENERAL', MARGIN, MARGIN, { width: WIDTH, align: 'right' });
        doc.fontSize(9).font('Helvetica').text(`Fecha: ${formatearFecha(record.visitDate)}`, MARGIN, MARGIN + 18, { width: WIDTH, align: 'right' });
        doc.fontSize(9).text(`Paciente: ${patient.firstName} ${patient.lastName}`, MARGIN, MARGIN + 32, { width: WIDTH, align: 'right' });
        y = Math.max(y, MARGIN + 55) + 10;

        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 12;

        const conHallazgos = (generalUltrasounds || []).filter((gu) => gu.findings && Object.keys(gu.findings).length);
        if (!conHallazgos.length) {
            doc.fontSize(9).font('Helvetica-Oblique').text('Sin hallazgos registrados.', MARGIN, y);
        }
        for (const gu of conHallazgos) {
            y = drawSubTypeSection(doc, gu.subType, gu.findings, MARGIN, y, WIDTH);
        }

        drawSignatureBlock(doc, doctor, MARGIN + WIDTH - 220, 740, 220);

        doc.end();
    });
}

module.exports = { buildGeneralUltrasoundPdf };
