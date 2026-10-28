const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistencia.controller');

// HU11: Registro de asistencia con timestamp
router.post('/', asistenciaController.registrarAsistencia);

// HU12: Historial filtrable de asistencias
router.get('/historial', asistenciaController.obtenerHistorial);

// HU09 + HU10: Validación instantánea por cédula (debe ir antes de GET /)
router.get('/validar/:cedula', asistenciaController.validarAccesoPorCedula);

router.get('/', asistenciaController.obtenerAsistencias);

module.exports = router;