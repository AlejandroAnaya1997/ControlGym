const db = require('../config/db');

const AsistenciaModel = {
  crear: (id_usuario, callback) => {
    const sql = `INSERT INTO asistencia (id_usuario, estado_ingreso) VALUES (?, 'PERMITIDO')`;
    db.run(sql, [id_usuario], callback);
  },
  obtenerTodas: (callback) => {
    const sql = `SELECT a.*, u.nombre FROM asistencia a JOIN usuario u ON a.id_usuario = u.id`;
    db.all(sql, [], callback);
  }
};

module.exports = AsistenciaModel;