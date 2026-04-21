'use strict';

const { LogAudit } = require('../models/index');

const enregistrerLog = async (action, description, utilisateurId, ipAdresse, donneesAvant = null, donneesApres = null) => {
  try {
    await LogAudit.create({
      action,
      description,
      utilisateurId,
      ipAdresse,
      donneesAvant,
      donneesApres
    });
  } catch (error) {
    console.error('Erreur log audit:', error.message);
  }
};

module.exports = { enregistrerLog };