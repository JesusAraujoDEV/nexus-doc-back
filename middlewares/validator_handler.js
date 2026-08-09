const boom = require('@hapi/boom');

// Nombres de campo en español para que el mensaje de error lo entienda la doctora,
// no el nombre técnico de la columna en inglés.
const FIELD_LABELS = {
  patientId: 'la paciente',
  diagnosis: 'el diagnóstico',
  symptoms: 'el motivo',
  treatment: 'el tratamiento',
  privateNotes: 'las observaciones',
  labOrders: 'los exámenes indicados',
  visitType: 'el tipo de consulta',
  visitDate: 'la fecha',
  firstName: 'el nombre',
  lastName: 'el apellido',
  cedula: 'la cédula',
  phone: 'el teléfono',
};

function friendlyMessage(detail) {
  const field = detail.context?.key;
  const label = FIELD_LABELS[field] || field || 'un campo';
  if (detail.type === 'any.required') return `Falta ${label}.`;
  return `Hay un problema con ${label}.`;
}

function validatorHandler(schema, property) {
  return (req, res, next) => {
    const data = req[property];
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });

    if (error) {
      const message = error.details.map(friendlyMessage).join(' ');
      next(boom.badRequest(message));
    } else {
      req[property] = value;
      next();
    }
  };
}

module.exports = validatorHandler;
