'use strict';

const express = require('express');
const healthRoutes = require('./routes/healthRoutes');

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
app.use('/api/health', healthRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
