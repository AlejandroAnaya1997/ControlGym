const UsuarioModel = require('../models/usuario.model');

// Regex para formato telefónico internacional: ej. +573001234567 (comienza con +, entre 7 y 15 dígitos)
const TELEFONO_INTL_REGEX = /^\+[1-9]\d{6,14}$/;

exports.crearUsuario = (req, res) => {
  const { cedula, nombre, telefono, contacto_emergencia, foto_url } = req.body;

  // Criterios de Aceptación HU04: Campos requeridos obligatorios
  if (!cedula || !cedula.trim()) {
    return res.status(400).json({ error: 'El documento de identidad (cédula) es obligatorio.' });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio.' });
  }

  if (!telefono || !telefono.trim()) {
    return res.status(400).json({ error: 'El teléfono es obligatorio.' });
  }

  // Validación de formato telefónico internacional
  const telefonoLimpio = telefono.trim();
  if (!TELEFONO_INTL_REGEX.test(telefonoLimpio)) {
    return res.status(400).json({
      error: 'El teléfono debe cumplir el formato internacional (ej. +573001234567, iniciando con + y código de país).'
    });
  }

  if (!contacto_emergencia || !contacto_emergencia.trim()) {
    return res.status(400).json({ error: 'El contacto de emergencia es obligatorio.' });
  }

  if (!foto_url || !foto_url.trim()) {
    return res.status(400).json({ error: 'La fotografía del afiliado es obligatoria.' });
  }

  // Validación de unicidad de documento de identidad
  UsuarioModel.obtenerPorCedula(cedula.trim(), (err, usuarioExistente) => {
    if (err) return res.status(500).json({ error: err.message });
    if (usuarioExistente) {
      return res.status(400).json({ error: `La cédula ${cedula.trim()} ya se encuentra registrada en el sistema.` });
    }

    UsuarioModel.crear(
      {
        cedula: cedula.trim(),
        nombre: nombre.trim(),
        telefono: telefonoLimpio,
        contacto_emergencia: contacto_emergencia.trim(),
        foto_url: foto_url.trim()
      },
      function(errCrear) {
        if (errCrear) {
          if (errCrear.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'La cédula ya se encuentra registrada.' });
          }
          return res.status(500).json({ error: errCrear.message });
        }

        res.status(201).json({
          mensaje: 'Afiliado registrado exitosamente.',
          id: this.lastID,
          cedula: cedula.trim(),
          nombre: nombre.trim(),
          telefono: telefonoLimpio,
          contacto_emergencia: contacto_emergencia.trim(),
          foto_url: foto_url.trim(),
          estado_membresia: 'SIN MEMBRESÍA'
        });
      }
    );
  });
};

exports.actualizarUsuario = (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, contacto_emergencia, foto_url } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }

  if (!telefono || !telefono.trim()) {
    return res.status(400).json({ error: 'El teléfono es obligatorio.' });
  }

  const telefonoLimpio = telefono.trim();
  if (!TELEFONO_INTL_REGEX.test(telefonoLimpio)) {
    return res.status(400).json({
      error: 'El teléfono debe cumplir el formato internacional (ej. +573001234567).'
    });
  }

  if (!contacto_emergencia || !contacto_emergencia.trim()) {
    return res.status(400).json({ error: 'El contacto de emergencia es obligatorio.' });
  }

  if (!foto_url || !foto_url.trim()) {
    return res.status(400).json({ error: 'La fotografía del afiliado es obligatoria.' });
  }

  UsuarioModel.obtenerPorId(id, (err, usuario) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!usuario) {
      return res.status(404).json({ error: 'Afiliado no encontrado.' });
    }

    UsuarioModel.actualizar(
      id,
      {
        nombre: nombre.trim(),
        telefono: telefonoLimpio,
        contacto_emergencia: contacto_emergencia.trim(),
        foto_url: foto_url.trim()
      },
      function(errActualizar) {
        if (errActualizar) return res.status(500).json({ error: errActualizar.message });

        res.json({
          mensaje: 'Perfil del afiliado actualizado exitosamente.',
          id: Number(id),
          nombre: nombre.trim(),
          telefono: telefonoLimpio,
          contacto_emergencia: contacto_emergencia.trim(),
          foto_url: foto_url.trim()
        });
      }
    );
  });
};

exports.obtenerUsuarioPorId = (req, res) => {
  const { id } = req.params;
  UsuarioModel.obtenerPorId(id, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Afiliado no encontrado.' });
    res.json(row);
  });
};

// HU06: Búsqueda y filtrado dinámico de afiliados
exports.obtenerUsuarios = (req, res) => {
  const termino = req.query.buscar || req.query.q || '';
  UsuarioModel.obtenerTodosConEstado(termino, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};