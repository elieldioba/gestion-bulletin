'use strict';

const { genererBulletinSemestre, genererBulletinAnnuel, genererBulletinHTML, genererBulletinAnnuelHTML } = require('../services/bulletin.service');
const { Semestre } = require('../models/index');

const telechargerBulletinSemestre = async (req, res) => {
  try {
    const { etudiantId, semestreId } = req.params;
    const semestre = await Semestre.findByPk(semestreId);
    if (!semestre) return res.status(404).json({ message: 'Semestre introuvable.' });

    const pdfBuffer = await genererBulletinSemestre(etudiantId, semestreId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bulletin_${semestre.libelle}_etudiant${etudiantId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur génération PDF.', erreur: error.message });
  }
};

const telechargerBulletinAnnuel = async (req, res) => {
  try {
    const { etudiantId } = req.params;
    const pdfBuffer = await genererBulletinAnnuel(etudiantId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bulletin_annuel_etudiant${etudiantId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur génération PDF.', erreur: error.message });
  }
};

const telechargerBulletinHTML = async (req, res) => {
  try {
    const { etudiantId, semestreId } = req.params;
    const html = await genererBulletinHTML(etudiantId, semestreId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bulletin_S${semestreId}_etudiant${etudiantId}.html`);
    res.send(html);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur génération HTML.', erreur: error.message });
  }
};

const telechargerBulletinAnnuelHTML = async (req, res) => {
  try {
    const { etudiantId } = req.params;
    const html = await genererBulletinAnnuelHTML(etudiantId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=bulletin_annuel_etudiant${etudiantId}.html`);
    res.send(html);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur génération HTML.', erreur: error.message });
  }
};

module.exports = { telechargerBulletinSemestre, telechargerBulletinAnnuel, telechargerBulletinHTML, telechargerBulletinAnnuelHTML };