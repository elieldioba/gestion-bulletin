'use strict';

const { Etudiant, Utilisateur } = require('../models/index');

// GET /api/etudiants — liste tous les étudiants
const listerEtudiants = async (req, res) => {
  try {
    const etudiants = await Etudiant.findAll({
      include: [{
        model: Utilisateur,
        attributes: ['email', 'estActif']
      }],
      order: [['nom', 'ASC']]
    });
    return res.status(200).json(etudiants);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// GET /api/etudiants/:id — un étudiant
const obtenirEtudiant = async (req, res) => {
  try {
    const etudiant = await Etudiant.findByPk(req.params.id, {
      include: [{
        model: Utilisateur,
        attributes: ['email', 'estActif']
      }]
    });
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant introuvable.' });
    }
    return res.status(200).json(etudiant);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// POST /api/etudiants — créer un étudiant
const creerEtudiant = async (req, res) => {
  try {
    const { nom, prenom, dateNaissance, lieuNaissance, typeBac, provenance, email, motDePasse } = req.body;

    // Créer le compte utilisateur
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(motDePasse || 'etudiant123', 10);

    const utilisateur = await Utilisateur.create({
      nomUtilisateur: `${prenom} ${nom}`,
      email,
      motDePasse: hash,
      role: 'ETUDIANT'
    });

    // Créer la fiche étudiant
    const etudiant = await Etudiant.create({
      nom,
      prenom,
      dateNaissance,
      lieuNaissance,
      typeBac,
      provenance,
      utilisateurId: utilisateur.id
    });

    return res.status(201).json({
      message: 'Étudiant créé avec succès.',
      etudiant
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// PUT /api/etudiants/:id — modifier un étudiant
const modifierEtudiant = async (req, res) => {
  try {
    const etudiant = await Etudiant.findByPk(req.params.id);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant introuvable.' });
    }
    await etudiant.update(req.body);
    return res.status(200).json({
      message: 'Étudiant modifié avec succès.',
      etudiant
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// DELETE /api/etudiants/:id — supprimer un étudiant
const supprimerEtudiant = async (req, res) => {
  try {
    const etudiant = await Etudiant.findByPk(req.params.id);
    if (!etudiant) {
      return res.status(404).json({ message: 'Étudiant introuvable.' });
    }
    await etudiant.destroy();
    return res.status(200).json({ message: 'Étudiant supprimé avec succès.' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

module.exports = { listerEtudiants, obtenirEtudiant, creerEtudiant, modifierEtudiant, supprimerEtudiant };