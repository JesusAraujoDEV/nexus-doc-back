const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');

const MARGIN = 40;
const WIDTH = 515;

function fila(doc, etiqueta, valor, x, y, width) {
    if (!valor) return y;
    doc.fontSize(9).font('Helvetica-Bold').text(`${etiqueta}: `, x, y, { width, continued: true });
    doc.font('Helvetica').text(String(valor));
    return doc.y + 4;
}

function buildInforme(doc, y, { report, patient }) {
    y = fila(doc, 'Referido a', report.referringDoctor
        ? `${report.referringDoctor.name}${report.referringDoctor.specialty ? ` (${report.referringDoctor.specialty})` : ''}`
        : null, MARGIN, y, WIDTH);
    y = fila(doc, 'Centro de salud', report.medicalCenter?.name, MARGIN, y, WIDTH);
    y += 10;

    if (report.content) {
        doc.fontSize(10).font('Helvetica').text(report.content, MARGIN, y, { width: WIDTH, align: 'justify' });
        y = doc.y;
    }
    return y;
}

function buildConstancia(doc, y, { patient }) {
    doc.fontSize(10).font('Helvetica');
    doc.text('Quien suscribe, hace constar por medio de la presente que la paciente ', MARGIN, y, { width: WIDTH, continued: true });
    doc.font('Helvetica-Bold').text(`${patient.firstName} ${patient.lastName}`, { continued: true });
    doc.font('Helvetica').text(`, titular de la cédula de identidad ${patient.cedula || 's/d'}, se expide la presente constancia por presentar:`);
    y = doc.y + 12;

    // Reutiliza `fila` para las etiquetas del formulario original: "Constancia que se
    // expide por presentar" / "Realizándosele", más el checkbox de reposo.
    return y;
}

/** Genera el PDF de un Informe Médico o una Constancia. Devuelve un Buffer. */
function buildMedicalReportPdf({ doctor, patient, report }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = drawLetterhead(doc, doctor, MARGIN, MARGIN, 260);
        const titulo = report.type === 'constancia' ? 'CONSTANCIA MÉDICA' : (report.title || 'INFORME MÉDICO');
        doc.fontSize(13).font('Helvetica-Bold').text(titulo, MARGIN, MARGIN, { width: WIDTH, align: 'right' });
        doc.fontSize(9).font('Helvetica').text(formatearFecha(report.createdAt), MARGIN, MARGIN + 18, { width: WIDTH, align: 'right' });
        y = Math.max(y, MARGIN + 40) + 15;

        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 10;
        y = fila(doc, 'Paciente', `${patient.firstName} ${patient.lastName}`, MARGIN, y, WIDTH);
        y = fila(doc, 'C.I', patient.cedula, MARGIN, y, WIDTH);
        y += 10;

        if (report.type === 'constancia') {
            y = buildConstancia(doc, y, { patient });
            y = fila(doc, 'Constancia que se expide por presentar', report.constanciaText, MARGIN, y, WIDTH);
            y = fila(doc, 'Realizándosele', report.realizandoseText, MARGIN, y, WIDTH);
            if (report.indicatesRest) {
                y += 4;
                doc.fontSize(10).font('Helvetica-Bold').text('Se indica reposo.', MARGIN, y);
                y = doc.y + 4;
            }
        } else {
            y = buildInforme(doc, y, { report, patient });
        }

        drawSignatureBlock(doc, doctor, MARGIN + 150, Math.max(y + 40, 650), WIDTH - 300);

        doc.end();
    });
}

module.exports = { buildMedicalReportPdf };
