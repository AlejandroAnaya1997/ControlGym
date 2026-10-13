const db = require('../config/db');

const UsuarioModel = {
  crear: (datos, callback) => {
    const { cedula, nombre, telefono, contacto_emergencia, foto_url } = datos;
    const sql = `INSERT INTO usuario (cedula, nombre, telefono, contacto_emergencia, foto_url) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [cedula, nombre, telefono, contacto_emergencia, foto_url], callback);
  },

  actualizar: (id, datos, callback) => {
    const { nombre, telefono, contacto_emergencia, foto_url } = datos;
    const sql = `UPDATE usuario SET nombre = ?, telefono = ?, contacto_emergencia = ?, foto_url = ? WHERE id = ?`;
    db.run(sql, [nombre, telefono, contacto_emergencia, foto_url, id], callback);
  },

  obtenerPorId: (id, callback) => {
    const sql = `
      SELECT u.*, 
             m.id AS id_membresia,
             m.tipo_plan AS plan_actual, 
             m.estado AS estado_membresia,
             m.fecha_inicio AS fecha_inicio_membresia,
             m.fecha_fin AS fecha_fin_membresia
      FROM usuario u
      LEFT JOIN (
        SELECT m1.*
        FROM membresia m1
        INNER JOIN (
          SELECT id_usuario, MAX(id) as max_id
          FROM membresia
          GROUP BY id_usuario
        ) m2 ON m1.id = m2.max_id
      ) m ON u.id = m.id_usuario
      WHERE u.id = ?
    `;
    db.get(sql, [id], callback);
  },

  obtenerPorCedula: (cedula, callback) => {
    const sql = `SELECT * FROM usuario WHERE cedula = ?`;
    db.get(sql, [cedula], callback);
  },

  obtenerTodosConEstado: (terminoBusqueda, callback) => {
    let sql = `
      SELECT u.*, 
             m.id AS id_membresia,
             m.tipo_plan AS plan_actual, 
             CASE 
               WHEN m.estado IS NULL THEN 'SIN MEMBRESÍA'
               WHEN date(m.fecha_fin) < date('now') THEN 'VENCIDO'
               ELSE m.estado 
             END AS estado_membresia,
             m.fecha_inicio AS fecha_inicio_membresia,
             m.fecha_fin AS fecha_fin_membresia
      FROM usuario u
      LEFT JOIN (
        SELECT m1.*
        FROM membresia m1
        INNER JOIN (
          SELECT id_usuario, MAX(id) as max_id
          FROM membresia
          GROUP BY id_usuario
        ) m2 ON m1.id = m2.max_id
      ) m ON u.id = m.id_usuario
    `;
    const params = [];

    if (terminoBusqueda && terminoBusqueda.trim() !== '') {
      sql += ` WHERE u.cedula LIKE ? OR u.nombre LIKE ?`;
      params.push(`%${terminoBusqueda.trim()}%`, `%${terminoBusqueda.trim()}%`);
    }

    sql += ` ORDER BY u.id DESC`;
    db.all(sql, params, callback);
  }
};

module.exports = UsuarioModel;