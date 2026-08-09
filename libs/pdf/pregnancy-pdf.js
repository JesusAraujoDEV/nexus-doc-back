const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');
const { gestationalAgeToday, dueDate, uncertainDateExplanation } = require('../pregnancy-calc');

const MARGIN = 40;
const WIDTH = 515;

function fila(doc, etiqueta, valor, x, y, width) {
    if (valor === undefined || valor === null || valor === '') return y;
    doc.fontSize(9).font('Helvetica-Bold').text(`${etiqueta}: `, x, y, { width, continued: true });
    doc.font('Helvetica').text(String(valor));
    return doc.y + 4;
}

/** Genera la Ficha de Embarazo: datos de la gesta + evolución (consultas obstétricas asociadas). Devuelve un Buffer. */
function buildPregnancyPdf({ doctor, patient, pregnancy, records }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = drawLetterhead(doc, doctor, MARGIN, MARGIN, 260);
        doc.fontSize(13).font('Helvetica-Bold').text('FICHA DE EMBARAZO', MARGIN, MARGIN, { width: WIDTH, align: 'right' });
        doc.fontSize(9).font('Helvetica').text(`Gesta N° ${pregnancy.pregnancyNumber}`, MARGIN, MARGIN + 18, { width: WIDTH, align: 'right' });
        y = Math.max(y, MARGIN + 40) + 15;

        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 10;
        y = fila(doc, 'Paciente', `${patient.firstName} ${patient.lastName}`, MARGIN, y, WIDTH);
        y = fila(doc, 'C.I', patient.cedula, MARGIN, y, WIDTH);
        y += 6;

        const ga = gestationalAgeToday(pregnancy.lmpDate);
        y = fila(doc, 'F.U.M', pregnancy.lmpDate ? formatearFecha(pregnancy.lmpDate) : null, MARGIN, y, WIDTH);
        y = fila(doc, 'Edad Gestacional', ga ? `${ga.weeks} semanas con ${ga.days} día(s)` : null, MARGIN, y, WIDTH);
        y = fila(doc, 'F.P.P', pregnancy.lmpDate ? formatearFecha(dueDate(pregnancy.lmpDate)) : null, MARGIN, y, WIDTH);

        const explicacion = uncertainDateExplanation(pregnancy);
        if (explicacion) {
            y += 4;
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#555').text(explicacion, MARGIN, y, { width: WIDTH });
            doc.fillColor('black');
            y = doc.y + 8;
        }

        if (pregnancy.isFinalized && pregnancy.newbornData) {
            y += 6;
            doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
            y += 8;
            doc.fontSize(11).font('Helvetica-Bold').text('Recién Nacido', MARGIN, y);
            y += 16;
            const n = pregnancy.newbornData;
            y = fila(doc, 'Nombre', n.name, MARGIN, y, WIDTH);
            y = fila(doc, 'Fecha de nacimiento', n.birthDate ? formatearFecha(n.birthDate) : null, MARGIN, y, WIDTH);
            y = fila(doc, 'Tipo de parto', n.deliveryType, MARGIN, y, WIDTH);
            y = fila(doc, 'Peso', n.weight ? `${n.weight} gr` : null, MARGIN, y, WIDTH);
            y = fila(doc, 'Talla', n.length ? `${n.length} cm` : null, MARGIN, y, WIDTH);
            y = fila(doc, 'Centro médico', n.medicalCenter, MARGIN, y, WIDTH);
            y = fila(doc, 'Observaciones', n.observations, MARGIN, y, WIDTH);
        }

        y += 6;
        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 8;
        doc.fontSize(11).font('Helvetica-Bold').text('Evolución', MARGIN, y);
        y += 18;
        doc.fontSize(9).font('Helvetica');
        for (const r of records) {
            const linea = `${formatearFecha(r.visitDate || r.createdAt)} — ${r.diagnosis || r.symptoms || r.visitType || 'Consulta'}`;
            doc.text(linea, MARGIN, y, { width: WIDTH });
            y = doc.y + 4;
        }
        if (!records.length) doc.font('Helvetica-Oblique').text('Sin consultas registradas todavía.', MARGIN, y);

        drawSignatureBlock(doc, doctor, MARGIN + WIDTH - 220, 750, 220);

        doc.end();
    });
}

module.exports = { buildPregnancyPdf };
