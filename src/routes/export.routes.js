'use strict';

const express = require('express');
const router = express.Router();
const { exporterReleve, exporterJury } = require('../controllers/export.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');

router.use(verifierToken);

router.get('/releve/:semestreId', exporterReleve);
router.get('/jury', autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'), exporterJury);

module.exports = router;