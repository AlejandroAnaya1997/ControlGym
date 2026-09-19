const db = require('../config/db');

const UsuarioModel = {
  crear: (datos, callback) => {
    const { cedula, nombre, telefono, contacto_emergencia, foto_url } = datos;
    const sql = `INSERT INTO usuario (cedula, nombre, telefono, contacto_emergencia, foto_url) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [cedula, nombre, telefono, contacto_emergencia || null, foto_url || null], callback);
  },
  obtenerTodos: (callback) => {
    db.all(`SELECT * FROM usuario`, [], callback);
  }
};

module.exports = UsuarioModel;