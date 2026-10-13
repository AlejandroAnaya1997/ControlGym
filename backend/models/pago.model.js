const db = require('../config/db');

const PagoModel = {
  crear: (datos, callback) => {
    const { id_usuario, id_membresia, monto, metodo_pago } = datos;
    const sql = `
      INSERT INTO pago (id_usuario, id_membresia, monto, metodo_pago, fecha_pago) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(sql, [id_usuario, id_membresia || null, monto, metodo_pago], callback);
  },

  obtenerPorId: (id, callback) => {
    const sql = `
      SELECT p.*, 
             u.nombre AS usuario_nombre, 
             u.cedula AS usuario_cedula, 
             u.telefono AS usuario_telefono,
             m.tipo_plan, 
             m.fecha_inicio AS membresia_inicio, 
             m.fecha_fin AS membresia_fin
      FROM pago p
      JOIN usuario u ON p.id_usuario = u.id
      LEFT JOIN membresia m ON p.id_membresia = m.id
      WHERE p.id = ?
    `;
    db.get(sql, [id], callback);
  },

  obtenerTodos: (callback) => {
    const sql = `
      SELECT p.*, 
             u.nombre AS usuario_nombre, 
             u.cedula AS usuario_cedula,
             m.tipo_plan
      FROM pago p
      JOIN usuario u ON p.id_usuario = u.id
      LEFT JOIN membresia m ON p.id_membresia = m.id
      ORDER BY p.id DESC
    `;
    db.all(sql, [], callback);
  },

  obtenerPorUsuario: (id_usuario, callback) => {
    const sql = `
      SELECT p.*, 
             u.nombre AS usuario_nombre, 
             u.cedula AS usuario_cedula,
             m.tipo_plan
      FROM pago p
      JOIN usuario u ON p.id_usuario = u.id
      LEFT JOIN membresia m ON p.id_membresia = m.id
      WHERE p.id_usuario = ?
      ORDER BY p.id DESC
    `;
    db.all(sql, [id_usuario], callback);
  }
};

module.exports = PagoModel;
