const PagoModel = require('../models/pago.model');
const UsuarioModel = require('../models/usuario.model');

const METODOS_PERMITIDOS = ['Efectivo', 'Tarjeta', 'Transferencia'];

exports.registrarPago = (req, res) => {
  const { id_usuario, id_membresia, monto, metodo_pago } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ error: 'El ID de usuario es obligatorio.' });
  }

  const montoNumerico = parseFloat(monto);
  if (isNaN(montoNumerico) || montoNumerico <= 0) {
    return res.status(400).json({ error: 'El monto a cobrar debe ser un valor numérico positivo mayor a 0.' });
  }

  if (!metodo_pago || !METODOS_PERMITIDOS.includes(metodo_pago)) {
    return res.status(400).json({
      error: `Método de pago inválido. Valores permitidos: ${METODOS_PERMITIDOS.join(', ')}.`
    });
  }

  // Verificar usuario
  UsuarioModel.obtenerPorId(id_usuario, (errUser, usuario) => {
    if (errUser) return res.status(500).json({ error: errUser.message });
    if (!usuario) {
      return res.status(404).json({ error: `El afiliado con ID ${id_usuario} no existe.` });
    }

    const membresiaId = id_membresia || usuario.id_membresia || null;

    PagoModel.crear(
      {
        id_usuario,
        id_membresia: membresiaId,
        monto: montoNumerico,
        metodo_pago
      },
      function(errPago) {
        if (errPago) return res.status(500).json({ error: errPago.message });

        const nuevoPagoId = this.lastID;

        // Consultar el registro completo con comprobante
        PagoModel.obtenerPorId(nuevoPagoId, (errDetalle, detalle) => {
          if (errDetalle) return res.status(500).json({ error: errDetalle.message });

          const numeroComprobante = `FZP-${new Date().getFullYear()}-${String(nuevoPagoId).padStart(5, '0')}`;
          
          res.status(201).json({
            mensaje: 'Pago procesado exitosamente y comprobante generado.',
            comprobante: {
              ...detalle,
              numero_comprobante: numeroComprobante,
              gimnasio: 'FitZone Popayán',
              nit: '900.123.456-7',
              direccion: 'Carrera 6 # 15N-32, Popayán, Cauca',
              telefono_gimnasio: '+57 312 888 9900'
            }
          });
        });
      }
    );
  });
};

exports.obtenerPagoPorId = (req, res) => {
  const { id } = req.params;
  PagoModel.obtenerPorId(id, (err, detalle) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!detalle) return res.status(404).json({ error: 'Comprobante de pago no encontrado.' });

    const numeroComprobante = `FZP-${new Date(detalle.fecha_pago).getFullYear() || new Date().getFullYear()}-${String(detalle.id).padStart(5, '0')}`;
    res.json({
      ...detalle,
      numero_comprobante: numeroComprobante,
      gimnasio: 'FitZone Popayán',
      nit: '900.123.456-7',
      direccion: 'Carrera 6 # 15N-32, Popayán, Cauca',
      telefono_gimnasio: '+57 312 888 9900'
    });
  });
};

exports.obtenerPagos = (req, res) => {
  PagoModel.obtenerTodos((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

exports.obtenerPagosPorUsuario = (req, res) => {
  const { id_usuario } = req.params;
  PagoModel.obtenerPorUsuario(id_usuario, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};
