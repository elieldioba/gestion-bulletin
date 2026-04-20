'use strict';

const { importerEtudiants, importerNotes } = require('../services/import.service');
const fs = require('fs');

const importerFichierEtudiants = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const resultats = await importerEtudiants(req.file.path);

    // Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      message: 'Import étudiants terminé.',
      resultats
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur import.', erreur: error.message });
  }
};

const importerFichierNotes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const resultats = await importerNotes(req.file.path);

    // Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      message: 'Import notes terminé.',
      ...resultats
    });

  } catch (error) {
    return res.status(500).json({ message: 'Erreur import.', erreur: error.message });
  }
};

module.exports = { importerFichierEtudiants, importerFichierNotes };