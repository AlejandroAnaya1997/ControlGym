const express = require('express');
const router = express.Router();
const membresiaController = require('../controllers/membresia.controller');

router.post('/', membresiaController.crearMembresia);
router.get('/', membresiaController.obtenerMembresias);
router.get('/vencimientos-5dias', membresiaController.obtenerVencimientos5Dias);

module.exports = router;