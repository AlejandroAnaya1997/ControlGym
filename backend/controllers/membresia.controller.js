const MembresiaModel = require('../models/membresia.model');
const UsuarioModel = require('../models/usuario.model');

exports.crearMembresia = (req, res) => {
  const { id_usuario, tipo_plan } = req.body;

  if (!id_usuario || !['Mensual', 'Trimestral', 'Anual'].includes(tipo_plan)) {
    return res.status(400).json({ error: 'Usuario y tipo de plan válido (Mensual, Trimestral, Anual) son requeridos.' });
  }

  // Verificar que el usuario exista
  UsuarioModel.obtenerPorId(id_usuario, (errUser, usuario) => {
    if (errUser) return res.status(500).json({ error: errUser.message });
    if (!usuario) {
      return res.status(404).json({ error: `El afiliado con ID ${id_usuario} no existe.` });
    }

    const fechaInicio = new Date();
    const fechaFin = new Date(fechaInicio);

    if (tipo_plan === 'Mensual') fechaFin.setMonth(fechaFin.getMonth() + 1);
    if (tipo_plan === 'Trimestral') fechaFin.setMonth(fechaFin.getMonth() + 3);
    if (tipo_plan === 'Anual') fechaFin.setFullYear(fechaFin.getFullYear() + 1);

    const fInicioStr = fechaInicio.toISOString().split('T')[0];
    const fFinStr = fechaFin.toISOString().split('T')[0];

    // Desactivar membresías anteriores para evitar duplicidad de planes activos
    MembresiaModel.desactivarAnteriores(id_usuario, (errDesact) => {
      if (errDesact) console.warn('Aviso: error al archivar membresías previas:', errDesact.message);

      MembresiaModel.crear({ id_usuario, tipo_plan, fInicioStr, fFinStr }, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
          mensaje: `Plan ${tipo_plan} asignado y activado exitosamente para ${usuario.nombre}.`,
          id: this.lastID,
          id_usuario,
          usuario_nombre: usuario.nombre,
          tipo_plan,
          fecha_inicio: fInicioStr,
          fecha_fin: fFinStr,
          estado: 'ACTIVO'
        });
      });
    });
  });
};

exports.obtenerMembresias = (req, res) => {
  MembresiaModel.obtenerTodas((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.obtenerMembresiasPorUsuario = (req, res) => {
  const { id_usuario } = req.params;
  MembresiaModel.obtenerPorUsuario(id_usuario, (err, rows) => {
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