const boom = require('@hapi/boom');

function validatorHandler(schema, property) {
  return (req, res, next) => {
    const data = req[property];
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });

    if (error) {
      next(boom.badRequest(error));
    } else {
      req[property] = value;
      next();
    }
  };
}

module.exports = validatorHandler;
