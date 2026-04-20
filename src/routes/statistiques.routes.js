'use strict';

const express = require('express');
const router = express.Router();
const { statistiquesPromotion, statistiquesAnnuelles } = require('../controllers/statistiques.controller');
const { verifierToken, autoriser } = require('../middlewares/auth.middleware');
const { recalculerTout } = require('../services/calcul.service');
const { Etudiant } = require('../models/index');

router.use(verifierToken);

router.get('/semestre/:semestreId', statistiquesPromotion);
router.get('/annuel', statistiquesAnnuelles);
router.post('/batch', autoriser('ADMINISTRATEUR'), async (req, res) => {
  try {
    const etudiants = await Etudiant.findAll();
    const resultats = [];

    for (const etudiant of etudiants) {
      const resultat = await recalculerTout(etudiant.id);
      resultats.push({
        etudiant: `${etudiant.prenom} ${etudiant.nom}`,
        resultats: resultat
      });
    }

    return res.status(200).json({
      message: `Recalcul effectué pour ${etudiants.length} étudiant(s).`,
      resultats
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
});
router.get('/jury', async (req, res) => {
  try {
    const etudiants = await Etudiant.findAll({ order: [['nom', 'ASC']] });
    const { Semestre, ResultatSemestre, ResultatAnnuel } = require('../models/index');
    const semestres = await Semestre.findAll();
    const s5 = semestres.find(s => s.libelle === 'S5');
    const s6 = semestres.find(s => s.libelle === 'S6');

    const tableau = [];
    for (const etudiant of etudiants) {
      const resultatS5 = await ResultatSemestre.findOne({ where: { etudiantId: etudiant.id, semestreId: s5.id } });
      const resultatS6 = await ResultatSemestre.findOne({ where: { etudiantId: etudiant.id, semestreId: s6.id } });
      const resultatAnnuel = await ResultatAnnuel.findOne({ where: { etudiantId: etudiant.id } });

      tableau.push({
        etudiant: { id: etudiant.id, nom: etudiant.nom, prenom: etudiant.prenom },
        S5: { moyenne: resultatS5?.moyenneSemestre || null, credits: resultatS5?.creditsTotal || 0, valide: resultatS5?.valide || false },
        S6: { moyenne: resultatS6?.moyenneSemestre || null, credits: resultatS6?.creditsTotal || 0, valide: resultatS6?.valide || false },
        annuel: {
          moyenneAnnuelle: resultatAnnuel?.moyenneAnnuelle || null,
          mention: resultatAnnuel?.mention || null,
          decision: resultatAnnuel?.decisionJury || null
        }
      });
    }

    return res.status(200).json({
      nombreEtudiants: tableau.length,
      tableau
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
});

module.exports = router;