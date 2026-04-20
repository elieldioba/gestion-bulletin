'use strict';

const { Semestre, UE, Matiere } = require('../models/index');

// ==================== SEMESTRES ====================

const listerSemestres = async (req, res) => {
  try {
    const semestres = await Semestre.findAll({
      include: [{ model: UE, include: [{ model: Matiere }] }]
    });
    return res.status(200).json(semestres);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const creerSemestre = async (req, res) => {
  try {
    const { libelle, anneeUniversitaire } = req.body;
    const semestre = await Semestre.create({ libelle, anneeUniversitaire });
    return res.status(201).json({ message: 'Semestre créé.', semestre });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// ==================== UE ====================

const listerUEs = async (req, res) => {
  try {
    const ues = await UE.findAll({
      include: [{ model: Matiere }, { model: Semestre }]
    });
    return res.status(200).json(ues);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const creerUE = async (req, res) => {
  try {
    const { code, libelle, semestreId } = req.body;
    const ue = await UE.create({ code, libelle, semestreId });
    return res.status(201).json({ message: 'UE créée.', ue });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const modifierUE = async (req, res) => {
  try {
    const ue = await UE.findByPk(req.params.id);
    if (!ue) return res.status(404).json({ message: 'UE introuvable.' });
    await ue.update(req.body);
    return res.status(200).json({ message: 'UE modifiée.', ue });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const supprimerUE = async (req, res) => {
  try {
    const ue = await UE.findByPk(req.params.id);
    if (!ue) return res.status(404).json({ message: 'UE introuvable.' });
    await ue.destroy();
    return res.status(200).json({ message: 'UE supprimée.' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// ==================== MATIERES ====================

const listerMatieres = async (req, res) => {
  try {
    const matieres = await Matiere.findAll({
      include: [{ model: UE, include: [{ model: Semestre }] }]
    });
    return res.status(200).json(matieres);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const creerMatiere = async (req, res) => {
  try {
    const { libelle, coefficient, credits, ueId } = req.body;
    const matiere = await Matiere.create({ libelle, coefficient, credits, ueId });
    return res.status(201).json({ message: 'Matière créée.', matiere });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const modifierMatiere = async (req, res) => {
  try {
    const matiere = await Matiere.findByPk(req.params.id);
    if (!matiere) return res.status(404).json({ message: 'Matière introuvable.' });
    await matiere.update(req.body);
    return res.status(200).json({ message: 'Matière modifiée.', matiere });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

const supprimerMatiere = async (req, res) => {
  try {
    const matiere = await Matiere.findByPk(req.params.id);
    if (!matiere) return res.status(404).json({ message: 'Matière introuvable.' });
    await matiere.destroy();
    return res.status(200).json({ message: 'Matière supprimée.' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

module.exports = {
  listerSemestres, creerSemestre,
  listerUEs, creerUE, modifierUE, supprimerUE,
  listerMatieres, creerMatiere, modifierMatiere, supprimerMatiere
};