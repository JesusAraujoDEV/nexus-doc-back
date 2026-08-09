const { etiqueta } = require('./ultrasound-labels');

/** Agrupa los hallazgos crudos (record.ultrasoundFindings) en las cajas del formato original de MedDig. */
function agruparSecciones(eco, patient) {
    const usadas = new Set();
    const tomar = (clave) => { usadas.add(clave); return eco[clave]; };

    const utero = [
        ['Posición', tomar('UTERO-POS')],
        ['Forma', tomar('UTERO-FOR')],
        ['Bordes', tomar('UTERO-BOR')],
        ['Miometrio', tomar('MIOMETRIO')],
    ].filter(([, v]) => v !== undefined);

    const dimensiones = [
        ['Long', fmtMm(tomar('LONG-MIOM'))],
        ['Transv', fmtMm(tomar('LONG-TRANSV-MIOM'))],
        ['Ant-Post', fmtMm(tomar('LONG-ANT-POST-MIOM'))],
    ].filter(([, v]) => v !== undefined);

    const endometrio = [
        ['Espesor', fmtMm(tomar('ESP-END'))],
        ['Características', tomar('ENDOMETRIO')],
    ].filter(([, v]) => v !== undefined);

    const fsDouglas = tomar('FS-DOUGLAS');
    const transductor = tomar('TIP-TRANS');

    const ovario = (lado) => {
        const estado = tomar(`OV-${lado}`);
        const dims = ['M1', 'M2', 'M3'].map((n) => tomar(`OV-${lado}-${n}`)).filter((v) => v !== undefined);
        if (estado === undefined && !dims.length) return null;
        const partes = [estado].filter(Boolean);
        if (dims.length === 3) partes.push(`${dims[0]} x ${dims[1]} x ${dims[2]} mm.`);
        return partes.join('\n');
    };

    const otrosHallazgos = tomar('O-HALL-DOP');
    const idx = tomar('IDX-FET-TXT');
    const observaciones = tomar('FS-OTROS');
    const paciente = [
        ['Nombre', `${patient.firstName} ${patient.lastName}`],
        ['C.I', patient.cedula],
        ['F.U.M', tomar('FUM')],
    ];

    // El historial gineco-obstétrico (gestas/partos/cesáreas/abortos) es antecedente
    // del PACIENTE, no de esta consulta puntual - vive en medical_background, no en
    // ultrasound_findings (que solo trae lo que se registró en este examen específico).
    const gineco = patient.medicalBackground?.antecedentesGinecoObs || {};
    const antecedentes = [
        ['N° Emb.', gineco.gestas],
        ['Partos', gineco.partos],
        ['Cesáreas', gineco.cesareas],
        ['Abortos', gineco.abortos],
    ].filter(([, v]) => v !== undefined && v !== null);

    // ovario() debe llamarse ANTES de armar `adicionales`: marca OV-* como usadas
    // vía tomar(), y `adicionales` filtra por lo que ya esté en `usadas`.
    const anexos = { ovarioDer: ovario('DER'), ovarioIzq: ovario('IZQ') };

    const adicionales = Object.entries(eco)
        .filter(([clave]) => !usadas.has(clave))
        .map(([clave, valor]) => [etiqueta(clave), valor]);

    return {
        paciente, antecedentes,
        exploracion: { transductor, utero, dimensiones, endometrio, fsDouglas },
        anexos,
        otrosHallazgos, idx, observaciones, transductorTexto: transductor,
        adicionales,
    };
}

function fmtMm(v) {
    return v === undefined ? undefined : `${v} mm.`;
}

module.exports = { agruparSecciones };
