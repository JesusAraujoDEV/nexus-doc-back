const crypto = require('crypto');
const boom = require('@hapi/boom');
const { config } = require('../config/config');

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();

/**
 * Token de la laptop de la doctora (LEGACY_SYNC_TOKEN). Solo habilita
 * /api/legacy-sync: subir un paquete y consultar su estado. No es un JWT y no
 * da acceso a ningún dato de la app.
 */
function requireSyncToken(req, res, next) {
  if (!config.legacySyncToken) return next(boom.serverUnavailable('La sincronización no está configurada'));
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Comparación en tiempo constante sobre hashes de igual largo.
  const ok = token && crypto.timingSafeEqual(hash(token), hash(config.legacySyncToken));
  if (!ok) return next(boom.unauthorized('Token de sincronización inválido'));
  return next();
}

module.exports = { requireSyncToken };
