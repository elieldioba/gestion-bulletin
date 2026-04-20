'use strict';

const express = require('express');
const router = express.Router();
const { listerEtudiants, obtenirEtudiant, creerEtudiant, modifierEtudiant, supprimerEtudiant } = require('../controllers/etudiant.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent un token
router.use(verifierToken);

router.get('/', listerEtudiants);
router.get('/:id', obtenirEtudiant);
router.post('/', autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'), creerEtudiant);
router.put('/:id', autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'), modifierEtudiant);
router.delete('/:id', autoriser('ADMINISTRATEUR'), supprimerEtudiant);

module.exports = router;