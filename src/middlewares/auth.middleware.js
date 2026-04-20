'use strict';

const jwt = require('jsonwebtoken');
const { Utilisateur } = require('../models/index');

// Vérifie que le token JWT est valide
const verifierToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const utilisateur = await Utilisateur.findByPk(decoded.id);

    if (!utilisateur || !utilisateur.estActif) {
      return res.status(401).json({ message: 'Utilisateur introuvable ou inactif.' });
    }

    req.utilisateur = utilisateur;
    next();

  } catch (error) {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
};

// Vérifie le rôle de l'utilisateur
const autoriser = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.utilisateur.role)) {
      return res.status(403).json({
        message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}`
      });
    }
    next();
  };
};

module.exports = { verifierToken, autoriser };