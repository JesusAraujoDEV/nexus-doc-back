const PDFDocument = require('pdfkit');
const { drawLetterhead, drawSignatureBlock, formatearFecha } = require('./letterhead');
const { agruparSecciones } = require('./ultrasound-sections');

const MARGIN = 40;
const WIDTH = 515;
const COLS = [MARGIN, MARGIN + 180, MARGIN + 360];
const COL_WIDTH = 165;

function header(doc, texto, x, y, width) {
    doc.fontSize(10).font('Helvetica-Bold').text(texto, x, y, { width });
    doc.moveTo(x, y + 13).lineTo(x + width, y + 13).stroke();
    return y + 20;
}

function fila(doc, etiqueta, valor, x, y, width) {
    if (valor === undefined || valor === null || valor === '') return y;
    doc.fontSize(8).font('Helvetica-Bold').text(`${etiqueta}: `, x, y, { width, continued: true });
    doc.font('Helvetica').text(String(valor));
    return doc.y + 2;
}

function subtitulo(doc, texto, x, y, width) {
    doc.fontSize(8).font('Helvetica-BoldOblique').text(texto, x, y, { width });
    return y + 11;
}

function drawExploracion(doc, s, x, y, width) {
    y = header(doc, 'Exploración', x, y, width);
    y = fila(doc, 'Transductor', s.transductor, x, y, width);
    if (s.utero.length) {
        y = subtitulo(doc, 'UTERO', x, y, width);
        for (const [l, v] of s.utero) y = fila(doc, l, v, x + 6, y, width - 6);
    }
    if (s.dimensiones.length) {
        y = subtitulo(doc, 'Dimensiones', x, y, width);
        for (const [l, v] of s.dimensiones) y = fila(doc, l, v, x + 6, y, width - 6);
    }
    if (s.endometrio.length) {
        y = subtitulo(doc, 'Endométrio', x, y, width);
        for (const [l, v] of s.endometrio) y = fila(doc, l, v, x + 6, y, width - 6);
    }
    y = fila(doc, 'F.S. Douglas', s.fsDouglas, x, y, width);
    return y;
}

function drawAnexos(doc, anexos, x, y, width) {
    y = header(doc, 'Anexos', x, y, width);
    y = fila(doc, 'Ovario D.', anexos.ovarioDer, x, y, width);
    y = fila(doc, 'Ovario I.', anexos.ovarioIzq, x, y, width);
    return y;
}

/** Genera el informe de "Exploración por Ultrasonidos" de una consulta, con el mismo formato de 3 columnas que MedDig. Devuelve un Buffer. */
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
        y = Math.max(y, MARGIN + 40) + 15;

        const s = agruparSecciones(record.ultrasoundFindings || {}, patient);

        let yFila1 = header(doc, 'Paciente', COLS[0], y, COL_WIDTH);
        for (const [l, v] of s.paciente) yFila1 = fila(doc, l, v, COLS[0], yFila1, COL_WIDTH);

        let yFila1b = header(doc, 'Antecedentes Gin-Obst y Qx', COLS[1], y, COL_WIDTH);
        for (const [l, v] of s.antecedentes) yFila1b = fila(doc, l, v, COLS[1], yFila1b, COL_WIDTH);

        const yFila1c = header(doc, 'Exámen físico', COLS[2], y, COL_WIDTH);

        y = Math.max(yFila1, yFila1b, yFila1c) + 10;
        doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
        y += 12;

        const yExploracion = drawExploracion(doc, s.exploracion, COLS[0], y, COL_WIDTH);
        const yAnexos = drawAnexos(doc, s.anexos, COLS[1], y, COL_WIDTH);
        let yOtros = header(doc, 'Otros Hallazgos y/o DOPPLER', COLS[2], y, COL_WIDTH);
        if (s.otrosHallazgos) {
            doc.fontSize(8).font('Helvetica').text(s.otrosHallazgos, COLS[2], yOtros, { width: COL_WIDTH });
            yOtros = doc.y;
        }

        y = Math.max(yExploracion, yAnexos, yOtros) + 10;
        y = fila(doc, 'IDx', s.idx, MARGIN, y, WIDTH) + 10;

        if (Object.keys(record.ultrasoundFindings || {}).length) {
            doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke();
            y += 6;
            const resumen = s.transductorTexto
                ? `ECOGRAFIA ${String(s.transductorTexto).toUpperCase()} CON LOS CARACTERES ANTES DESCRITOS`
                : 'ECOGRAFIA CON LOS CARACTERES ANTES DESCRITOS';
            doc.fontSize(8).font('Helvetica').fillColor('#1a3a8f').text(resumen, MARGIN, y, { width: WIDTH });
            doc.fillColor('black');
            y = doc.y + 10;
        }

        y = header(doc, 'Observaciones y Recomendaciones', MARGIN, y, WIDTH);
        if (s.observaciones) {
            doc.fontSize(8).font('Helvetica').text(s.observaciones, MARGIN, y, { width: WIDTH });
            y = doc.y + 8;
        }

        if (s.adicionales.length) {
            y = header(doc, 'Datos adicionales', MARGIN, y + 4, WIDTH);
            for (const [l, v] of s.adicionales) y = fila(doc, l, v, MARGIN, y, WIDTH);
        }

        if (!Object.keys(record.ultrasoundFindings || {}).length) {
            doc.fontSize(9).font('Helvetica-Oblique').text('Sin hallazgos registrados.', MARGIN, y);
        }

        // Espacio en blanco para firma/sello a mano, abajo a la derecha, como en el informe original.
        drawSignatureBlock(doc, doctor, MARGIN + WIDTH - 220, 740, 220);

        doc.end();
    });
}

module.exports = { buildUltrasoundPdf };
