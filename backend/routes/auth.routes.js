// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', controller.usuarioAutenticado);

module.exports = router;
