/** Cálculos de embarazo: única fuente de verdad, usada por el service y el PDF. */

const DAY_MS = 86400000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// toLocaleDateString usa la hora LOCAL del server: una fecha-solo como "2026-08-09"
// se parsea como medianoche UTC, y en un server con TZ negativa el día mostrado
// queda uno atrás. getUTC* evita el problema (mismo patrón que libs/pdf/letterhead.js).
function formatearFechaUTC(fecha) {
    const d = new Date(fecha);
    return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function daysBetween(a, b) {
    return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

/** F.U.M. aproximada: fecha de la eco menos las semanas+días que esa eco indica de edad gestacional. */
function estimateLmpDate(referenceDate, weeks, days) {
    const ref = new Date(referenceDate);
    const totalDays = Number(weeks) * 7 + Number(days);
    return new Date(ref.getTime() - totalDays * DAY_MS).toISOString().slice(0, 10);
}

/** Regla de Naegele: F.P.P. = F.U.M. + 280 días. */
function dueDate(lmpDate) {
    return new Date(new Date(lmpDate).getTime() + 280 * DAY_MS).toISOString().slice(0, 10);
}

/** Semanas/días de embarazo HOY a partir de la F.U.M. Null si no hay F.U.M. o el embarazo ya terminó (>42 sem). */
function gestationalAgeToday(lmpDate) {
    if (!lmpDate) return null;
    const totalDays = daysBetween(new Date(lmpDate), new Date());
    if (totalDays < 0) return null;
    const weeks = Math.floor(totalDays / 7);
    if (weeks > 42) return null;
    return { weeks, days: totalDays % 7 };
}

/** Texto explicativo tal como lo arma VRunner, para mostrar en la ficha y en el PDF. */
function uncertainDateExplanation(p) {
    if (p.lmpSource !== 'estimated' || !p.lmpDate) return null;
    const fecha = formatearFechaUTC(p.lmpReferenceDate);
    return `F.U.M establecida por método de fecha incierta según ecografía de fecha ${fecha} `
        + `que indica edad gestacional de ${p.lmpReferenceWeeks} semana(s) con ${p.lmpReferenceDays} día(s).`;
}

module.exports = { estimateLmpDate, dueDate, gestationalAgeToday, uncertainDateExplanation };
