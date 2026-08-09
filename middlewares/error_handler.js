const { ValidationError, UniqueConstraintError } = require('sequelize');

// Mensajes legibles para la doctora en vez del nombre técnico de la columna.
const FRIENDLY_FIELD_NAMES = {
  cedula: 'esa cédula',
  legacy_record_id: 'ese registro',
};

function friendlyUniqueMessage(err) {
  const field = Object.keys(err.fields || {})[0];
  const cual = FRIENDLY_FIELD_NAMES[field] || 'ese dato';
  return `Ya existe una paciente con ${cual}. Si la borraste antes, restáurala desde la papelera en vez de crear una nueva.`;
}

// Cada handler que YA mandó la respuesta debe cortar la cadena (return), si no el
// siguiente handler intenta mandar otra respuesta encima y el server explota con
// "Cannot set headers after they are sent to the client".
function logErrors(err, req, res, next) {
  console.error(err);
  next(err);
}

function errorHandler(err, req, res, next) {
  res.status(500).json({
    message: err.message,
    stack: err.stack,
  });
}

function boomErrorHandler(err, req, res, next) {
  if (err.isBoom) {
    const { output } = err;
    res.status(output.statusCode).json(output.payload);
    return;
  }
  next(err);
}

function ormErrorHandler(err, req, res, next) {
  if (err instanceof UniqueConstraintError) {
    res.status(409).json({ statusCode: 409, message: friendlyUniqueMessage(err) });
    return;
  }
  if (err instanceof ValidationError) {
    res.status(409).json({
      statusCode: 409,
      message: err.errors?.[0]?.message || err.name,
      errors: err.errors,
    });
    return;
  }
  next(err);
}

module.exports = { logErrors, errorHandler, boomErrorHandler, ormErrorHandler };
