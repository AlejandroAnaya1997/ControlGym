const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pago.controller');

router.post('/', pagoController.registrarPago);
router.get('/', pagoController.obtenerPagos);
router.get('/:id', pagoController.obtenerPagoPorId);
router.get('/usuario/:id_usuario', pagoController.obtenerPagosPorUsuario);

module.exports = router;
