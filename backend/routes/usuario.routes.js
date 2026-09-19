const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

router.post('/', usuarioController.crearUsuario);
router.get('/', usuarioController.obtenerUsuarios);

module.exports = router;