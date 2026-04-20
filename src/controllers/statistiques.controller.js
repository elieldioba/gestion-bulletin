'use strict';

const { Etudiant, ResultatSemestre, ResultatAnnuel, Semestre } = require('../models/index');

const statistiquesPromotion = async (req, res) => {
  try {
    const { semestreId } = req.params;
    const etudiants = await Etudiant.findAll();

    const moyennes = [];
    for (const etudiant of etudiants) {
      const resultat = await ResultatSemestre.findOne({
        where: { etudiantId: etudiant.id, semestreId }
      });
      if (resultat && resultat.moyenneSemestre !== null) {
        moyennes.push({
          etudiant: `${etudiant.prenom} ${etudiant.nom}`,
          moyenne: resultat.moyenneSemestre,
          credits: resultat.creditsTotal,
          valide: resultat.valide
        });
      }
    }

    if (moyennes.length === 0) {
      return res.status(200).json({ message: 'Aucune donnée disponible.' });
    }

    const valeurs = moyennes.map(m => m.moyenne);
    const moyenneClasse = Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 100) / 100;
    const min = Math.min(...valeurs);
    const max = Math.max(...valeurs);

    // Écart-type
    const variance = valeurs.reduce((sum, v) => sum + Math.pow(v - moyenneClasse, 2), 0) / valeurs.length;
    const ecartType = Math.round(Math.sqrt(variance) * 100) / 100;

    const nbValides = moyennes.filter(m => m.valide).length;

    return res.status(200).json({
      semestreId,
      nombreEtudiants: moyennes.length,
      moyenneClasse,
      minimum: min,
      maximum: max,
      ecartType,
      nbValides,
      nbNonValides: moyennes.length - nbValides,
      tauxReussite: `${Math.round((nbValides / moyennes.length) * 100)}%`,
      details: moyennes.sort((a, b) => b.moyenne - a.moyenne)
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const statistiquesAnnuelles = async (req, res) => {
  try {
    const etudiants = await Etudiant.findAll();
    const resultats = [];

    for (const etudiant of etudiants) {
      const resultat = await ResultatAnnuel.findOne({
        where: { etudiantId: etudiant.id }
      });
      if (resultat) {
        resultats.push({
          etudiant: `${etudiant.prenom} ${etudiant.nom}`,
          moyenneAnnuelle: resultat.moyenneAnnuelle,
          decision: resultat.decisionJury,
          mention: resultat.mention
        });
      }
    }

    if (resultats.length === 0) {
      return res.status(200).json({ message: 'Aucune donnée disponible.' });
    }

    const valeurs = resultats.map(r => r.moyenneAnnuelle).filter(v => v !== null);
    const moyenneClasse = Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 100) / 100;
    const variance = valeurs.reduce((sum, v) => sum + Math.pow(v - moyenneClasse, 2), 0) / valeurs.length;
    const ecartType = Math.round(Math.sqrt(variance) * 100) / 100;

    const diplomes = resultats.filter(r => r.decision === 'DIPLOME').length;
    const reprises = resultats.filter(r => r.decision === 'REPRISE_SOUTENANCE').length;
    const redoublants = resultats.filter(r => r.decision === 'REDOUBLE').length;

    return res.status(200).json({
      nombreEtudiants: resultats.length,
      moyenneClasse,
      minimum: Math.min(...valeurs),
      maximum: Math.max(...valeurs),
      ecartType,
      decisions: { diplomes, reprises, redoublants },
      tauxReussite: `${Math.round((diplomes / resultats.length) * 100)}%`,
      details: resultats.sort((a, b) => b.moyenneAnnuelle - a.moyenneAnnuelle)
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

module.exports = { statistiquesPromotion, statistiquesAnnuelles };