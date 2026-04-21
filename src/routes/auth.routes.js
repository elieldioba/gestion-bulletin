'use strict';

const express = require('express');
const router = express.Router();
const { register, login, moi } = require('../controllers/auth.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');


//router.post('/register', register);
router.post('/register', verifierToken, autoriser('ADMINISTRATEUR'), register);
router.post('/login', login);
router.get('/me', verifierToken, moi);


module.exports = router;