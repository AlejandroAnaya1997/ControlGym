const AsistenciaModel = require('../models/asistencia.model');

// HU11: Registrar asistencia con timestamp automático
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

// HU09 + HU10: Validar acceso instantáneo por cédula (< 1 seg según RNF-01)
exports.validarAccesoPorCedula = (req, res) => {
  const { cedula } = req.params;

  if (!cedula || !cedula.trim()) {
    return res.status(400).json({ error: 'La cédula es requerida.' });
  }

  AsistenciaModel.validarPorCedula(cedula.trim(), (err, usuario) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!usuario) {
      return res.status(404).json({ error: 'No se encontró ningún afiliado con esa cédula.' });
    }
    res.json(usuario);
  });
};

// HU12: Consulta histórica de asistencias con filtros
exports.obtenerHistorial = (req, res) => {
  const { termino, fechaInicio, fechaFin } = req.query;

  AsistenciaModel.obtenerConFiltros(
    termino || '',
    fechaInicio || null,
    fechaFin || null,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};