'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Utilisateur, Etudiant } = require('../models/index');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { nomUtilisateur, email, motDePasse, role } = req.body;

    // Vérifier si l'email existe déjà
    const existant = await Utilisateur.findOne({ where: { email } });
    if (existant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Hasher le mot de passe
    const hash = await bcrypt.hash(motDePasse, 10);

    // Créer l'utilisateur
    const utilisateur = await Utilisateur.create({
      nomUtilisateur,
      email,
      motDePasse: hash,
      role
    });

    // Si c'est un étudiant, créer sa fiche
    if (role === 'ETUDIANT') {
      await Etudiant.create({
        nom: req.body.nom || nomUtilisateur,
        prenom: req.body.prenom || '',
        utilisateurId: utilisateur.id
      });
    }

    return res.status(201).json({
      message: 'Compte créé avec succès.',
      utilisateur: {
        id: utilisateur.id,
        nomUtilisateur: utilisateur.nomUtilisateur,
        email: utilisateur.email,
        role: utilisateur.role
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // Trouver l'utilisateur
    const utilisateur = await Utilisateur.findOne({ where: { email } });
    if (!utilisateur) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Vérifier le mot de passe
    const valide = await bcrypt.compare(motDePasse, utilisateur.motDePasse);
    if (!valide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // Vérifier que le compte est actif
    if (!utilisateur.estActif) {
      return res.status(401).json({ message: 'Compte désactivé.' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: utilisateur.id, role: utilisateur.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Connexion réussie.',
      token,
      utilisateur: {
        id: utilisateur.id,
        nomUtilisateur: utilisateur.nomUtilisateur,
        email: utilisateur.email,
        role: utilisateur.role
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

// GET /api/auth/me
const moi = async (req, res) => {
  try {
    return res.status(200).json({
      id: req.utilisateur.id,
      nomUtilisateur: req.utilisateur.nomUtilisateur,
      email: req.utilisateur.email,
      role: req.utilisateur.role
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur.', erreur: error.message });
  }
};

module.exports = { register, login, moi };