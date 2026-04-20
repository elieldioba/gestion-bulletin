'use strict';

const express = require('express');
const router = express.Router();
const { saisirNote, obtenirNotes, supprimerNote } = require('../controllers/note.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');

router.use(verifierToken);

router.post('/', autoriser('ADMINISTRATEUR', 'ENSEIGNANT', 'SECRETARIAT_PEDAGOGIQUE'), saisirNote);
router.get('/:etudiantId', obtenirNotes);
router.delete('/:id', autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'), supprimerNote);

module.exports = router;