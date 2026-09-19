'use strict';

const express = require('express');
const path = require('node:path');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

// Los modelos quedan disponibles para los servicios y sus asociaciones se
// registran una sola vez. La creación física de tablas corresponde a E11.
require('./models/Cuenta');
require('./models/Materia');
require('./models/Tarea');
require('./models/PreferenciaVisual');
require('./models/SesionEstudio');
require('./models/Insignia');
require('./models/CuentaInsignia');
require('./models/Punto');
require('./models/Reto');
require('./models/Meta');
require('./models/Recordatorio');
require('./models/NivelCuenta');
require('./models/Notificacion');

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', resourceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
