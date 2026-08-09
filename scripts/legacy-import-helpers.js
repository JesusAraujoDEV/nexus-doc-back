/** Helpers compartidos para mapear registros decodificados de MedDig/VRunner a filas de patients/clinical_records. */

function splitName(nombre) {
    const parts = (nombre || '').trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0] || 'Sin nombre', lastName: '' };
    const mid = Math.ceil(parts.length / 2);
    return { firstName: parts.slice(0, mid).join(' '), lastName: parts.slice(mid).join(' ') };
}

function parseDDMMYYYY(s) {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || '');
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function soloDigitos(cedula) {
    return (cedula || '').replace(/\D/g, '');
}

/** Cédulas repetidas dentro del mismo archivo fuente no se usan para nada: ni para matchear ni para grabar (constraint unique). */
function cedulasDuplicadas(pacientes) {
    const counts = new Map();
    for (const p of pacientes) {
        const c = soloDigitos(p.CEDULA);
        if (/^\d{6,9}$/.test(c)) counts.set(c, (counts.get(c) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c));
}

function cedulaUsable(p, duplicadas) {
    const c = soloDigitos(p.CEDULA);
    return /^\d{6,9}$/.test(c) && !duplicadas.has(c) ? c : null;
}

function buildMedicalBackground(p) {
    const bg = {};
    if (p.OCUPACION) bg.ocupacion = p.OCUPACION;
    if (p['LUG-NAC']) bg.lugarNacimiento = p['LUG-NAC'];
    if (p.ALERGIAS) bg.alergias = p.ALERGIAS;
    if (p['CIR-PREV']) bg.cirugiasPrevias = p['CIR-PREV'];
    if (p['OTROS-GIN']) bg.notas = p['OTROS-GIN'];
    const gineco = {};
    if (p.MENARQUIA) gineco.menarquia = p.MENARQUIA;
    if (p['NUM-EMB'] !== undefined) gineco.gestas = p['NUM-EMB'];
    if (p['NUM-CES'] !== undefined) gineco.cesareas = p['NUM-CES'];
    if (p.IRS !== undefined) gineco.irs = p.IRS;
    if (Object.keys(gineco).length) bg.antecedentesGinecoObs = gineco;
    return bg;
}

function buildPatientRow(p, doctorId, legacyRecordId, cedula) {
    const { firstName, lastName } = splitName(p.NOMBRE);
    return {
        doctorId,
        firstName,
        lastName,
        cedula,
        historyNumber: p.HISTORIA || null,
        birthDate: parseDDMMYYYY(p['FECH-NAC']),
        phone: p.CELULAR || null,
        gender: p.SEXO === 'F' ? 'Femenino' : p.SEXO === 'M' ? 'Masculino' : null,
        address: p.DIRECCION || null,
        medicalBackground: buildMedicalBackground(p),
        legacyRecordId,
    };
}

/** Los signos vitales solo existen en un puñado de consultas: se anotan solo si hay algo. */
function notasSignosVitales(c) {
    const partes = [];
    if (c.taAlta || c.taBaja) partes.push(`T.A. ${c.taAlta || 0}/${c.taBaja || 0}`);
    if (c.peso) partes.push(`Peso ${c.peso}`);
    return partes.length ? partes.join('  ') : null;
}

function buildRecordRow(c, doctorId, patientId, legacyRecordIdOffset = 0) {
    return {
        patientId,
        doctorId,
        visitDate: c.fecha,
        visitType: c.motivo || null,
        symptoms: c.motivo || null,
        diagnosis: c.diagnostico || null,
        treatment: c.tratamiento || null,
        labOrders: c.examenes || null,
        privateNotes: notasSignosVitales(c),
        legacyRecordId: legacyRecordIdOffset + c.legacyRecordId,
    };
}

module.exports = { soloDigitos, cedulasDuplicadas, cedulaUsable, buildPatientRow, buildRecordRow };
