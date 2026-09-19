const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Importar conexión a la Base de Datos
require('./config/db');

// Rutas modulares
app.use('/usuarios', require('./routes/usuario.routes'));
app.use('/membresias', require('./routes/membresia.routes'));
app.use('/asistencias', require('./routes/asistencia.routes'));

// Ruta de Salud
app.get('/health', (req, res) => {
  res.json({ estado: 'OK', mensaje: 'Servidor ControlGym funcionando con arquitectura modular' });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`Servidor ControlGym modular escuchando en http://localhost:${PORT}`);
});
