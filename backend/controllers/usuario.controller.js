const UsuarioModel = require('../models/usuario.model');

exports.crearUsuario = (req, res) => {
  const { cedula, nombre, telefono, contacto_emergencia, foto_url } = req.body;

  if (!cedula || !nombre || !telefono) {
    return res.status(400).json({ error: 'Cédula, nombre y teléfono son obligatorios.' });
  }

  UsuarioModel.crear({ cedula, nombre, telefono, contacto_emergencia, foto_url }, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'La cédula ya se encuentra registrada.' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, cedula, nombre, telefono, contacto_emergencia, foto_url });
  });
};

exports.obtenerUsuarios = (req, res) => {
  UsuarioModel.obtenerTodos((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};