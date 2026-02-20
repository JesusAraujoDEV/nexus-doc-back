require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'dev',
  port: process.env.PORT || 3000,
  isProd: process.env.NODE_ENV === 'production',
  db_url: process.env.DB_URL,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL,
  backendUrl: process.env.BACKEND_URL,
  corsWhitelist: process.env.CORS_WHITELIST
    ? process.env.CORS_WHITELIST.split(',')
    : ['http://localhost:3000'],
};

module.exports = { config };
