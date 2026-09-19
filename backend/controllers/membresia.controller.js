const MembresiaModel = require('../models/membresia.model');

exports.crearMembresia = (req, res) => {
  const { id_usuario, tipo_plan } = req.body;

  if (!id_usuario || !['Mensual', 'Trimestral', 'Anual'].includes(tipo_plan)) {
    return res.status(400).json({ error: 'Usuario y tipo de plan válido son requeridos.' });
  }

  const fechaInicio = new Date();
  const fechaFin = new Date(fechaInicio);

  if (tipo_plan === 'Mensual') fechaFin.setMonth(fechaFin.getMonth() + 1);
  if (tipo_plan === 'Trimestral') fechaFin.setMonth(fechaFin.getMonth() + 3);
  if (tipo_plan === 'Anual') fechaFin.setFullYear(fechaFin.getFullYear() + 1);

  const fInicioStr = fechaInicio.toISOString().split('T')[0];
  const fFinStr = fechaFin.toISOString().split('T')[0];

  MembresiaModel.crear({ id_usuario, tipo_plan, fInicioStr, fFinStr }, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      id_usuario,
      tipo_plan,
      fecha_inicio: fInicioStr,
      fecha_fin: fFinStr,
      estado: 'ACTIVO'
    });
  });
};

exports.obtenerMembresias = (req, res) => {
  MembresiaModel.obtenerTodas((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.obtenerVencimientos5Dias = (req, res) => {
  MembresiaModel.obtenerVencimientos5Dias((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};