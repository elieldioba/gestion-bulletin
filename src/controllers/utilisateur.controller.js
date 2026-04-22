'use strict';

const { Utilisateur } = require('../models/index');
const bcrypt = require('bcryptjs');

// [POST] Créer un utilisateur
exports.creerUtilisateur = async (req, res) => {
  try {
    const { nomUtilisateur, email, motDePasse, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(motDePasse, salt);

    const user = await Utilisateur.create({
      nomUtilisateur,
      email,
      motDePasse: hashedPassword,
      role
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// [GET] Récupérer tous les utilisateurs
exports.recupererTous = async (req, res) => {
  try {
    const users = await Utilisateur.findAll({
      attributes: { exclude: ['motDePasse'] } // Sécurité : on ne renvoie jamais le MDP
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// [GET] Récupérer un utilisateur par ID
exports.recupererUn = async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id, {
      attributes: { exclude: ['motDePasse'] }
    });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// [PUT] Modifier un utilisateur
exports.modifierUtilisateur = async (req, res) => {
  try {
    const { nomUtilisateur, email, role, estActif } = req.body;
    const user = await Utilisateur.findByPk(req.params.id);

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    await user.update({ nomUtilisateur, email, role, estActif });
    res.status(200).json({ message: "Mise à jour réussie", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// [DELETE] Supprimer un utilisateur
exports.supprimerUtilisateur = async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    await user.destroy();
    res.status(200).json({ message: "Utilisateur supprimé définitivement" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};