const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Base de datos SQLite de ControlGym conectada correctamente.');
  }
});

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

  // Tabla: PAGO (GCP-HU08)
  db.run(`
    CREATE TABLE IF NOT EXISTS pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER,
      id_membresia INTEGER,
      monto DECIMAL(10, 2) NOT NULL,
      metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
      fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE,
      FOREIGN KEY (id_membresia) REFERENCES membresia(id) ON DELETE SET NULL
    )
  `, () => {
    // Migración segura por si la tabla ya existía sin id_usuario
    db.run(`ALTER TABLE pago ADD COLUMN id_usuario INTEGER REFERENCES usuario(id);`, () => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_pago_usuario ON pago(id_usuario)`);
    });

    // Migración segura por si id_membresia tenía restricción NOT NULL en versiones previas
    db.all(`PRAGMA table_info(pago)`, [], (errCols, cols) => {
      if (!errCols && cols) {
        const colMembresia = cols.find(c => c.name === 'id_membresia');
        if (colMembresia && colMembresia.notnull === 1) {
          db.serialize(() => {
            db.run(`PRAGMA foreign_keys = OFF;`);
            db.run(`CREATE TABLE IF NOT EXISTS pago_migrado (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              id_usuario INTEGER,
              id_membresia INTEGER,
              monto DECIMAL(10, 2) NOT NULL,
              metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
              fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE,
              FOREIGN KEY (id_membresia) REFERENCES membresia(id) ON DELETE SET NULL
            )`);
            db.run(`INSERT INTO pago_migrado (id, id_usuario, id_membresia, monto, metodo_pago, fecha_pago)
                    SELECT id, id_usuario, id_membresia, monto, metodo_pago, fecha_pago FROM pago`);
            db.run(`DROP TABLE pago`);
            db.run(`ALTER TABLE pago_migrado RENAME TO pago`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_pago_usuario ON pago(id_usuario)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_pago_fecha ON pago(fecha_pago)`);
            db.run(`PRAGMA foreign_keys = ON;`);
          });
        }
      }
    });
  });

  // Índices para optimización (RNF-01, RNF-04)
  db.run(`CREATE INDEX IF NOT EXISTS idx_membresia_fecha_fin ON membresia(fecha_fin)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_asistencia_fecha_ingreso ON asistencia(fecha_ingreso)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usuario_cedula ON usuario(cedula)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pago_fecha ON pago(fecha_pago)`);
});

module.exports = db;