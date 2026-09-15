const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Conexión a la base de datos SQLite en backend/database.sqlite
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Base de datos SQLite de ControlGym conectada correctamente.');
  }
});

// Inicialización de tablas DDL
db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON;`);

  // Tabla: USUARIO
  db.run(`
    CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula VARCHAR(20) NOT NULL UNIQUE,
      nombre VARCHAR(100) NOT NULL,
      telefono VARCHAR(20) NOT NULL,
      contacto_emergencia VARCHAR(100),
      foto_url TEXT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla: MEMBRESIA
  db.run(`
    CREATE TABLE IF NOT EXISTS membresia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      tipo_plan VARCHAR(20) NOT NULL CHECK (tipo_plan IN ('Mensual', 'Trimestral', 'Anual')),
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'VENCIDO', 'CANCELADO')),
      FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE
    )
  `);

  // Tabla: PAGO
  db.run(`
    CREATE TABLE IF NOT EXISTS pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_membresia INTEGER NOT NULL,
      monto DECIMAL(10, 2) NOT NULL,
      metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
      fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_membresia) REFERENCES membresia(id) ON DELETE CASCADE
    )
  `);

  // Tabla: ASISTENCIA
  db.run(`
    CREATE TABLE IF NOT EXISTS asistencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      estado_ingreso VARCHAR(20) NOT NULL DEFAULT 'PERMITIDO',
      FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE
    )
  `);

  // Índices para búsquedas eficientes (RNF-01 y RNF-04)
  db.run(`CREATE INDEX IF NOT EXISTS idx_membresia_fecha_fin ON membresia(fecha_fin)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_asistencia_fecha_ingreso ON asistencia(fecha_ingreso)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usuario_cedula ON usuario(cedula)`);
});

// Endpoint de verificación del servidor
app.get('/health', (req, res) => {
  res.json({ estado: 'OK', mensaje: 'Servidor ControlGym funcionando correctamente' });
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`Servidor ControlGym escuchando en http://localhost:${PORT}`);
});