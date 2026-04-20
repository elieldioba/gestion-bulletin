'use strict';

const express = require('express');
const router = express.Router();
const { importerFichierEtudiants, importerFichierNotes } = require('../controllers/import.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(verifierToken);
router.use(autoriser('ADMINISTRATEUR', 'SECRETARIAT_PEDAGOGIQUE'));

router.post('/etudiants', upload.single('fichier'), importerFichierEtudiants);
router.post('/notes', upload.single('fichier'), importerFichierNotes);

module.exports = router;