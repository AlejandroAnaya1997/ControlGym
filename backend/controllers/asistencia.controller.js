const AsistenciaModel = require('../models/asistencia.model');

exports.registrarAsistencia = (req, res) => {
  const { id_usuario } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ error: 'El ID de usuario es requerido.' });
  }

  AsistenciaModel.crear(id_usuario, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      id_usuario,
      estado_ingreso: 'PERMITIDO',
      fecha_ingreso: new Date()
    });
  });
};

exports.obtenerAsistencias = (req, res) => {
  AsistenciaModel.obtenerTodas((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};