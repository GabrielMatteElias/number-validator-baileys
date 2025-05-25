const express = require('express');
const whatsappController = require('../controller/whatsapp.controller');

const router = express.Router();

// POST /whatsapp/enviar-mensagem
router.get('/conectar', whatsappController.conectarClient);

// POST /whatsapp/validar-numero
router.post('/validar-numero', whatsappController.validarWhatsApp);

module.exports = router;