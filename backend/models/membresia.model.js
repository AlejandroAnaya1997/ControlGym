const db = require('../config/db');

const MembresiaModel = {
  crear: (datos, callback) => {
    const { id_usuario, tipo_plan, fInicioStr, fFinStr } = datos;
    const sql = `INSERT INTO membresia (id_usuario, tipo_plan, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, 'ACTIVO')`;
    db.run(sql, [id_usuario, tipo_plan, fInicioStr, fFinStr], callback);
  },
  obtenerTodas: (callback) => {
    const sql = `SELECT m.*, u.nombre FROM membresia m JOIN usuario u ON m.id_usuario = u.id`;
    db.all(sql, [], callback);
  },
  obtenerVencimientos5Dias: (callback) => {
    const sql = `
      SELECT m.id, m.tipo_plan, m.fecha_fin, u.nombre, u.telefono 
      FROM membresia m
      JOIN usuario u ON m.id_usuario = u.id
      WHERE m.fecha_fin = DATE('now', '+5 days') AND m.estado = 'ACTIVO'
    `;
    db.all(sql, [], callback);
  }
};

module.exports = MembresiaModel;