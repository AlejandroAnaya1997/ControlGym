const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Importar conexión a la Base de Datos
require('./config/db');

// Ruta de Salud (habilitada en /api/health y /health por compatibilidad)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ estado: 'OK', mensaje: 'Servidor ControlGym funcionando con arquitectura modular' });
});

// Rutas modulares con el prefijo /api requerido por el Frontend
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/membresias', require('./routes/membresia.routes'));
app.use('/api/asistencias', require('./routes/asistencia.routes'));
app.use('/api/pagos', require('./routes/pago.routes'));

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor ControlGym modular escuchando en http://localhost:${PORT}`);
});