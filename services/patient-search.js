const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');

const VISITS_COUNT_SQL = '(SELECT COUNT(*) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")';
const LAST_VISIT_SQL = '(SELECT MAX(COALESCE(visit_date, created_at::date)) FROM clinical_records WHERE clinical_records.patient_id = "Patient"."id")';
const PREGNANT_SQL = `EXISTS (
  SELECT 1 FROM pregnancies
  WHERE pregnancies.patient_id = "Patient"."id"
    AND pregnancies.is_finalized = false AND pregnancies.is_loss = false
    AND pregnancies.is_ectopic = false AND pregnancies.deleted_at IS NULL
)`;

const SORT_COLUMNS = {
    name: ['firstName', 'lastName'],
    cedula: ['cedula'],
    createdAt: ['createdAt'],
    visitsCount: [sequelize.literal(VISITS_COUNT_SQL)],
    lastVisit: [sequelize.literal(LAST_VISIT_SQL)],
};

// "Vacío" para cada columna ordenable: sin cédula, cero consultas, sin
// visita registrada. Estos registros van siempre al final, sea ASC o DESC
// — si no, alternar la dirección los pone de primero justo cuando el
// usuario quiere ver los que sí tienen dato, que es la mitad del tiempo.
const EMPTY_LAST_SQL = {
    cedula: '"Patient"."cedula" IS NULL',
    visitsCount: `${VISITS_COUNT_SQL} = 0`,
    lastVisit: `${LAST_VISIT_SQL} IS NULL`,
};

function buildOrder(sortBy, sortDir) {
    const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';
    const columns = SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt;
    const order = [];
    if (EMPTY_LAST_SQL[sortBy]) {
        order.push([sequelize.literal(EMPTY_LAST_SQL[sortBy]), 'ASC']);
    }
    for (const col of columns) {
        order.push([col, dir]);
    }
    return order;
}

function buildSearchWhere(doctorId, { search, gender, hasVisits, hasCedula, pregnant }) {
    const where = { doctorId };
    const and = [];

    if (search) {
        const like = { [Op.iLike]: `%${search}%` };
        // Nombres largos ("Adriana Josefina Hernández Piña") no matchean como un solo
        // substring contra una búsqueda parcial ("Adriana Hernández"): cada palabra
        // buscada tiene que aparecer en el nombre completo, en cualquier orden.
        const fullNameColumn = sequelize.fn('concat', sequelize.col('first_name'), ' ', sequelize.col('last_name'));
        const words = search.trim().split(/\s+/);
        const allWordsMatch = { [Op.and]: words.map((w) => sequelize.where(fullNameColumn, { [Op.iLike]: `%${w}%` })) };
        where[Op.or] = [
            { firstName: like },
            { lastName: like },
            { cedula: like },
            { phone: like },
            allWordsMatch,
        ];
    }

    if (gender) where.gender = gender;

    if (hasVisits === 'true') and.push(sequelize.literal(`${VISITS_COUNT_SQL} > 0`));
    else if (hasVisits === 'false') and.push(sequelize.literal(`${VISITS_COUNT_SQL} = 0`));

    if (hasCedula === 'true') where.cedula = { [Op.not]: null };
    else if (hasCedula === 'false') where.cedula = null;

    if (pregnant === 'true') and.push(sequelize.literal(PREGNANT_SQL));

    if (and.length) where[Op.and] = and;

    return where;
}

module.exports = { VISITS_COUNT_SQL, LAST_VISIT_SQL, buildOrder, buildSearchWhere };
