require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { config } = require('./config/config');

const routerApi = require('./routes');
const setupSwagger = require('./swagger');
const { logErrors, errorHandler, ormErrorHandler, boomErrorHandler } = require('./middlewares/error_handler');

const app = express();
const port = config.port || 3000;

const whitelist = config.corsWhitelist;
const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());

require('./utils/auth');

app.get('/', (req, res) => {
  res.send('¡Bienvenido al Backend de NexusDoc!');
});

app.get('/api', (req, res) => {
  res.send('Estado de la API de NexusDoc: OK');
});

routerApi(app);
setupSwagger(app);

app.use(logErrors);
app.use(ormErrorHandler);
app.use(boomErrorHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`config.isProd: ${config.isProd}`);
  console.log(`config.db_url: ${config.db_url}`);
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
