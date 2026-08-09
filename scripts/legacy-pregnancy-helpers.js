/** Helpers para mapear filas de EMBARAZO.DAT (VRunner) a columnas de pregnancies. */

function buildNewbornData(fila) {
    const hasData = fila.nombreBebe || fila.pesoBebe || fila.longitudBebe
        || fila.centroMedNacBebe || fila.fechaNac || fila.tipoParto
        || fila.lesionPerineal || fila.observaciones;
    if (!hasData) return null;
    return {
        birthDate: fila.fechaNac || null,
        deliveryType: fila.tipoParto || null,
        name: fila.nombreBebe || null,
        weight: fila.pesoBebe || null,
        length: fila.longitudBebe || null,
        medicalCenter: fila.centroMedNacBebe || null,
        perinealInjury: fila.lesionPerineal || null,
        observations: fila.observaciones || null,
    };
}

function buildPregnancyUpdate(fila, newbornData) {
    return [
        fila.fum,
        fila.fumFchIncierta ? 'estimated' : 'reported',
        fila.fumFchIncRef,
        fila.fiSemanas,
        fila.fiDias,
        fila.sexo === 'M' || fila.sexo === 'F' ? fila.sexo : null,
        fila.finalizado,
        fila.porPerdida,
        fila.ectopico,
        newbornData ? JSON.stringify(newbornData) : null,
        fila.numeroEmb,
        fila.codigo,
        'Importado desde EMBARAZO.DAT (VRunner), código legado ' + fila.codigo + '.',
    ];
}

module.exports = { buildNewbornData, buildPregnancyUpdate };
