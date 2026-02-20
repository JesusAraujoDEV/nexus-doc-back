const boom = require('@hapi/boom');
const passport = require('passport');

const authenticateJwt = passport.authenticate('jwt', { session: false });

function checkRoles(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return next(boom.unauthorized('Authentication required.'));
    }
    if (roles.includes(user.role)) {
      return next();
    }
    return next(boom.forbidden('Access denied. Insufficient role.'));
  };
}

module.exports = {
  authenticateJwt,
  checkRoles,
};
