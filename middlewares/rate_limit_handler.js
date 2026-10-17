const rateLimit = require('express-rate-limit');

const generalReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
});

const generalWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

// Fuerza bruta contra el login: 10 intentos por IP cada 15 minutos.
// Los logins exitosos no cuentan, así que la doctora no se bloquea a sí misma.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Demasiados intentos. Esperá unos minutos y volvé a probar.' },
});

// Reserva pública de citas (landing, sin login): 5 por IP por hora para que no
// se pueda llenar la agenda con basura.
const publicBookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Demasiadas solicitudes de cita. Probá más tarde.' },
});

module.exports = { generalReadLimiter, generalWriteLimiter, loginLimiter, publicBookingLimiter };
