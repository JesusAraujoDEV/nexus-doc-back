const { config } = require('./../config/config');
const fs = require('fs');
const path = require('path');

let sslConfigCli = {};

if (config.isProd) {
  let caCert = null;
  const caCertPath = path.join(__dirname, '..', 'ca.crt');

  if (fs.existsSync(caCertPath)) {
    caCert = fs.readFileSync(caCertPath, 'utf8');
    console.log('INFO: CA certificate loaded from file for Sequelize CLI.');
  } else {
    console.error('ERROR: CA certificate file (ca.crt) not found for production migrations at:', caCertPath);
    throw new Error('Database CA certificate file not found for production migrations. Cannot connect to PostgreSQL.');
  }

  sslConfigCli = {
    require: true,
    rejectUnauthorized: true,
    ca: caCert,
  };
}

module.exports = {
  development: {
    url: config.db_url,
    dialect: 'postgres',
  },
  production: {
    url: config.db_url,
    dialect: 'postgres',
    ...(Object.keys(sslConfigCli).length > 0 && { dialectOptions: { ssl: sslConfigCli } }),
  },
};
