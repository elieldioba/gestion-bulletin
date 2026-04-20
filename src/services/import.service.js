'use strict';

const XLSX = require('xlsx');
const { Etudiant, Utilisateur, Matiere, Evaluation } = require('../models/index');
const { recalculerTout } = require('./calcul.service');
const bcrypt = require('bcryptjs');

const importerEtudiants = async (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const resultats = [];

  for (const row of rows) {
    try {
      const email = row['Email'] || `${row['Nom']}.${row['Prenom']}@inptic.ga`.toLowerCase();

      // Vérifier si l'étudiant existe déjà
      let utilisateur = await Utilisateur.findOne({ where: { email } });

      if (!utilisateur) {
        const hash = await bcrypt.hash('etudiant123', 10);
        utilisateur = await Utilisateur.create({
          nomUtilisateur: `${row['Prenom']} ${row['Nom']}`,
          email,
          motDePasse: hash,
          role: 'ETUDIANT'
        });

        await Etudiant.create({
          nom: row['Nom'],
          prenom: row['Prenom'],
          dateNaissance: row['DateNaissance'] || null,
          lieuNaissance: row['LieuNaissance'] || null,
          typeBac: row['TypeBac'] || null,
          provenance: row['Provenance'] || null,
          utilisateurId: utilisateur.id
        });
      }

      resultats.push({
        email,
        statut: utilisateur ? 'créé' : 'existant'
      });

    } catch (error) {
      resultats.push({
        ligne: row,
        erreur: error.message
      });
    }
  }

  return resultats;
};

const importerNotes = async (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const resultats = [];
  const etudiantsRecalcules = new Set();

  for (const row of rows) {
    try {
      // Chercher l'étudiant par nom/prénom
      const etudiant = await Etudiant.findOne({
        where: {
          nom: row['Nom'],
          prenom: row['Prenom']
        }
      });

      if (!etudiant) {
        resultats.push({ ligne: row, erreur: 'Étudiant introuvable' });
        continue;
      }

      // Chercher la matière par libellé
      const matiere = await Matiere.findOne({
        where: { libelle: row['Matiere'] }
      });

      if (!matiere) {
        resultats.push({ ligne: row, erreur: `Matière introuvable : ${row['Matiere']}` });
        continue;
      }

      // Saisir les notes
      const types = [
        { col: 'CC', type: 'CC' },
        { col: 'Examen', type: 'EXAMEN' },
        { col: 'Rattrapage', type: 'RATTRAPAGE' }
      ];

      for (const { col, type } of types) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
          const note = parseFloat(row[col]);
          if (!isNaN(note) && note >= 0 && note <= 20) {
            let evaluation = await Evaluation.findOne({
              where: { etudiantId: etudiant.id, matiereId: matiere.id, type }
            });
            if (evaluation) {
              await evaluation.update({ note, dateSaisie: new Date() });
            } else {
              await Evaluation.create({
                etudiantId: etudiant.id,
                matiereId: matiere.id,
                type,
                note,
                dateSaisie: new Date()
              });
            }
          }
        }
      }

      etudiantsRecalcules.add(etudiant.id);
      resultats.push({
        etudiant: `${row['Prenom']} ${row['Nom']}`,
        matiere: row['Matiere'],
        statut: 'importé'
      });

    } catch (error) {
      resultats.push({ ligne: row, erreur: error.message });
    }
  }

  // Recalcul en cascade pour tous les étudiants modifiés
  for (const etudiantId of etudiantsRecalcules) {
    await recalculerTout(etudiantId);
  }

  return {
    total: rows.length,
    importes: resultats.filter(r => r.statut === 'importé').length,
    erreurs: resultats.filter(r => r.erreur),
    details: resultats
  };
};

module.exports = { importerEtudiants, importerNotes };