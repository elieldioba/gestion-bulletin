'use strict';

const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/utilisateur.controller');
// Optionnel : ajoute ton middleware d'auth ici plus tard pour protéger ces routes
// const { verifierToken, autoriser } = require('../middlewares/auth.middleware');


// --- Routes d'Administration ---
router.get('/', userCtrl.recupererTous);           // GET : Lire tout
router.get('/:id', userCtrl.recupererUn);         // GET : Lire un seul
router.put('/:id', userCtrl.modifierUtilisateur);  // PUT : Modifier
router.delete('/:id', userCtrl.supprimerUtilisateur); // DELETE : Supprimer

module.exports = router;