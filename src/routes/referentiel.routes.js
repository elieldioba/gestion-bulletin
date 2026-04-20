'use strict';

const express = require('express');
const router = express.Router();
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');
const {
  listerSemestres, creerSemestre,
  listerUEs, creerUE, modifierUE, supprimerUE,
  listerMatieres, creerMatiere, modifierMatiere, supprimerMatiere
} = require('../controllers/referentiel.controller');

router.use(verifierToken);

// Semestres
router.get('/semestres', listerSemestres);
router.post('/semestres', autoriser('ADMINISTRATEUR'), creerSemestre);

// UE
router.get('/ues', listerUEs);
router.post('/ues', autoriser('ADMINISTRATEUR'), creerUE);
router.put('/ues/:id', autoriser('ADMINISTRATEUR'), modifierUE);
router.delete('/ues/:id', autoriser('ADMINISTRATEUR'), supprimerUE);

// Matières
router.get('/matieres', listerMatieres);
router.post('/matieres', autoriser('ADMINISTRATEUR'), creerMatiere);
router.put('/matieres/:id', autoriser('ADMINISTRATEUR'), modifierMatiere);
router.delete('/matieres/:id', autoriser('ADMINISTRATEUR'), supprimerMatiere);

module.exports = router;