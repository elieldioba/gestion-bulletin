'use strict';

const { Absence, Etudiant, Matiere } = require('../models/index');
const { recalculerTout } = require('../services/calcul.service');
const { enregistrerLog } = require('../services/audit.service');

const listerAbsences = async (req, res) => {
  try {
    const absences = await Absence.findAll({
      where: { etudiantId: req.params.etudiantId },
      include: [{ model: Matiere }]
    });
    return res.status(200).json(absences);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const saisirAbsence = async (req, res) => {
  try {
    const { etudiantId, matiereId, heures } = req.body;

    if (heures < 0) {
      return res.status(400).json({ message: 'Les heures doivent être positives.' });
    }

    let absence = await Absence.findOne({ where: { etudiantId, matiereId } });

    if (absence) {
      await absence.update({ heures });
    } else {
      absence = await Absence.create({ etudiantId, matiereId, heures });
    }

    await enregistrerLog(
      'CREATION_ABSENCE',
      `Absence enregistrée : étudiant ${etudiantId}, matière ${matiereId}, ${heures}h`,
      req.utilisateur.id,
      req.ip,
      null,
      { heures }
    );

    // Recalcul avec pénalité
    const resultats = await recalculerTout(etudiantId);

    return res.status(200).json({
      message: 'Absence enregistrée.',
      absence,
      resultats
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const supprimerAbsence = async (req, res) => {
  try {
    const absence = await Absence.findByPk(req.params.id);
    if (!absence) return res.status(404).json({ message: 'Absence introuvable.' });

    const { etudiantId } = absence;
    await absence.destroy();

    const resultats = await recalculerTout(etudiantId);
    return res.status(200).json({ message: 'Absence supprimée.', resultats });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

module.exports = { listerAbsences, saisirAbsence, supprimerAbsence };