'use strict';

const express = require('express');
const router = express.Router();
const { listerAbsences, saisirAbsence, supprimerAbsence } = require('../controllers/absence.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');

router.use(verifierToken);

router.get('/etudiants', listerAbsences);
router.get('/:etudiantId', listerAbsences);
router.post('/', autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'), saisirAbsence);
router.delete('/:id', autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'), supprimerAbsence);

module.exports = router;