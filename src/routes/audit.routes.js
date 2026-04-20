'use strict';

const express = require('express');
const router = express.Router();
const { LogAudit, Utilisateur } = require('../models/index');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');

router.use(verifierToken);
router.use(autoriser('ADMINISTRATEUR'));

// GET /api/audit — liste tous les logs
router.get('/', async (req, res) => {
  try {
    const logs = await LogAudit.findAll({
      include: [{ model: Utilisateur, attributes: ['nomUtilisateur', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
});

// GET /api/audit/utilisateur/:id — logs d'un utilisateur
router.get('/utilisateur/:id', async (req, res) => {
  try {
    const logs = await LogAudit.findAll({
      where: { utilisateurId: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
});

module.exports = router;