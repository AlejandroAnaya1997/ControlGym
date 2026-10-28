const db = require('../config/db');

const AsistenciaModel = {
  // HU11: Insertar registro de asistencia con timestamp automático
  crear: (id_usuario, callback) => {
    const sql = `INSERT INTO asistencia (id_usuario, estado_ingreso) VALUES (?, 'PERMITIDO')`;
    db.run(sql, [id_usuario], callback);
  },

  obtenerTodas: (callback) => {
    const sql = `SELECT a.*, u.nombre FROM asistencia a JOIN usuario u ON a.id_usuario = u.id ORDER BY a.fecha_ingreso DESC`;
    db.all(sql, [], callback);
  },

  // HU09 + HU10: Validar acceso por cédula — retorna usuario con estado membresía y foto
  validarPorCedula: (cedula, callback) => {
    const sql = `
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
      WHERE u.cedula = ?
    `;
    db.get(sql, [cedula], callback);
  },

  // HU12: Consulta histórica por usuario con filtro de fechas
  obtenerPorUsuario: (id_usuario, fechaInicio, fechaFin, callback) => {
    let sql = `
      SELECT a.id, a.fecha_ingreso, a.estado_ingreso, u.nombre, u.cedula
      FROM asistencia a
      JOIN usuario u ON a.id_usuario = u.id
      WHERE a.id_usuario = ?
    `;
    const params = [id_usuario];

    if (fechaInicio) {
      sql += ` AND date(a.fecha_ingreso) >= date(?)`;
      params.push(fechaInicio);
    }
    if (fechaFin) {
      sql += ` AND date(a.fecha_ingreso) <= date(?)`;
      params.push(fechaFin);
    }

    sql += ` ORDER BY a.fecha_ingreso DESC`;
    db.all(sql, params, callback);
  },

  // HU12: Búsqueda de asistencias con filtro de cédula/nombre y fechas
  obtenerConFiltros: (termino, fechaInicio, fechaFin, callback) => {
    let sql = `
      SELECT a.id, a.fecha_ingreso, a.estado_ingreso, u.nombre, u.cedula, u.id AS id_usuario
      FROM asistencia a
      JOIN usuario u ON a.id_usuario = u.id
      WHERE 1=1
    `;
    const params = [];

    if (termino && termino.trim() !== '') {
      sql += ` AND (u.cedula LIKE ? OR u.nombre LIKE ?)`;
      params.push(`%${termino.trim()}%`, `%${termino.trim()}%`);
    }
    if (fechaInicio) {
      sql += ` AND date(a.fecha_ingreso) >= date(?)`;
      params.push(fechaInicio);
    }
    if (fechaFin) {
      sql += ` AND date(a.fecha_ingreso) <= date(?)`;
      params.push(fechaFin);
    }

    sql += ` ORDER BY a.fecha_ingreso DESC LIMIT 200`;
    db.all(sql, params, callback);
  }
};

module.exports = AsistenciaModel;