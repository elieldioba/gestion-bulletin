'use strict';

const { Evaluation, Matiere } = require('../models/index');
const { recalculerTout } = require('../services/calcul.service');
const { enregistrerLog } = require('../services/audit.service');


// POST /api/notes — saisir une note
const saisirNote = async (req, res) => {
  try {
    const { etudiantId, matiereId, type, note } = req.body;

    if (note < 0 || note > 20) {
      return res.status(400).json({ message: 'La note doit être comprise entre 0 et 20.' });
    }

    let evaluation = await Evaluation.findOne({
      where: { etudiantId, matiereId, type }
    });

    const donneesAvant = evaluation ? { note: evaluation.note } : null;

    if (evaluation) {
      await evaluation.update({ note, dateSaisie: new Date() });
      await enregistrerLog(
        'MODIFICATION_NOTE',
        `Note ${type} modifiée pour étudiant ${etudiantId}, matière ${matiereId} : ${donneesAvant.note} → ${note}`,
        req.utilisateur.id,
        req.ip,
        donneesAvant,
        { note }
      );
    } else {
      evaluation = await Evaluation.create({
        etudiantId, matiereId, type, note, dateSaisie: new Date()
      });
      await enregistrerLog(
        'CREATION_NOTE',
        `Note ${type} créée pour étudiant ${etudiantId}, matière ${matiereId} : ${note}`,
        req.utilisateur.id,
        req.ip,
        null,
        { note }
      );
    }

    const resultats = await recalculerTout(etudiantId);

    return res.status(200).json({
      message: `Note de ${type} saisie avec succès.`,
      evaluation,
      resultats
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const obtenirNotes = async (req, res) => {
  try {
    const evaluations = await Evaluation.findAll({
      where: { etudiantId: req.params.etudiantId },
      include: [{ model: Matiere }],
      order: [['matiereId', 'ASC']]
    });
    return res.status(200).json(evaluations);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const supprimerNote = async (req, res) => {
  try {
    const evaluation = await Evaluation.findByPk(req.params.id);
    if (!evaluation) return res.status(404).json({ message: 'Note introuvable.' });

    const { etudiantId } = evaluation;
    const donneesAvant = { note: evaluation.note, type: evaluation.type };

    await evaluation.destroy();

    await enregistrerLog(
      'SUPPRESSION_NOTE',
      `Note ${evaluation.type} supprimée pour étudiant ${etudiantId}`,
      req.utilisateur.id,
      req.ip,
      donneesAvant,
      null
    );

    const resultats = await recalculerTout(etudiantId);
    return res.status(200).json({ message: 'Note supprimée.', resultats });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

module.exports = { saisirNote, obtenirNotes, supprimerNote };