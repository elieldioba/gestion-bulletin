'use strict';

const { LogAudit } = require('../models/index');

const enregistrerLog = async (action, description, utilisateurId, ipAdresse, donnéesAvant = null, donnéesAprès = null) => {
  try {
    await LogAudit.create({
      action,
      description,
      utilisateurId,
      ipAdresse,
      donnéesAvant,
      donnéesAprès
    });
  } catch (error) {
    console.error('Erreur log audit:', error.message);
  }
};

module.exports = { enregistrerLog };