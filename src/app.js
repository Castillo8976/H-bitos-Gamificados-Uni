'use strict';

/** Composición HTTP (RF01–RF15/HU01–HU28, M15): registra modelos, rutas y
 * archivos públicos. server.js escucha el puerto e inicializa el DDL.
 */

const express = require('express');
const path = require('node:path');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const progressRoutes = require('./routes/progressRoutes');
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
app.use('/api', progressRoutes);
app.use('/api', resourceRoutes);

// P15 y P18 se abren por URL directa según el mapa de navegación. La
// autorización real continúa en la API; estas rutas solo entregan la vista.
app.get(['/admin', '/revisor'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
