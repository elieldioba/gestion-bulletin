'use strict';

const express = require('express');
const router = express.Router();
const { Parametrage } = require('../models/index');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');

router.use(verifierToken);
router.use(autoriser('ADMINISTRATEUR'));

// GET — liste tous les paramètres
router.get('/', async (req, res) => {
  try {
    const parametres = await Parametrage.findAll();
    return res.status(200).json(parametres);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
});

// PUT — modifier un paramètre
router.put('/:cle', async (req, res) => {
  try {
    const { valeur } = req.body;
    const parametre = await Parametrage.findOne({ where: { cle: req.params.cle } });

    if (!parametre) {
      return res.status(404).json({ message: 'Paramètre introuvable.' });
    }

    await parametre.update({ valeur });
    return res.status(200).json({ message: 'Paramètre mis à jour.', parametre });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
});

module.exports = router;