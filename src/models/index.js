'use strict';

const sequelize = require('../config/config');
const Utilisateur = require('./Utilisateur');
const Etudiant = require('./Etudiant');
const Semestre = require('./Semestre');
const UE = require('./UE');
const Matiere = require('./Matiere');
const Evaluation = require('./Evaluation');
const Absence = require('./Absence');
const MoyenneMatiere = require('./MoyenneMatiere');
const MoyenneUE = require('./MoyenneUE');
const ResultatSemestre = require('./ResultatSemestre');
const ResultatAnnuel = require('./ResultatAnnuel');
const LogAudit = require('./LogAudit');
const Parametrage = require('./Parametrage');


// Utilisateur <-> Etudiant
Utilisateur.hasOne(Etudiant, { foreignKey: 'utilisateurId' });
Etudiant.belongsTo(Utilisateur, { foreignKey: 'utilisateurId' });

// Semestre <-> UE
Semestre.hasMany(UE, { foreignKey: 'semestreId' });
UE.belongsTo(Semestre, { foreignKey: 'semestreId' });

// UE <-> Matiere
UE.hasMany(Matiere, { foreignKey: 'ueId' });
Matiere.belongsTo(UE, { foreignKey: 'ueId' });

// Etudiant <-> Evaluation
Etudiant.hasMany(Evaluation, { foreignKey: 'etudiantId' });
Evaluation.belongsTo(Etudiant, { foreignKey: 'etudiantId' });

// Matiere <-> Evaluation
Matiere.hasMany(Evaluation, { foreignKey: 'matiereId' });
Evaluation.belongsTo(Matiere, { foreignKey: 'matiereId' });

// Etudiant <-> Absence
Etudiant.hasMany(Absence, { foreignKey: 'etudiantId' });
Absence.belongsTo(Etudiant, { foreignKey: 'etudiantId' });

// Matiere <-> Absence
Matiere.hasMany(Absence, { foreignKey: 'matiereId' });
Absence.belongsTo(Matiere, { foreignKey: 'matiereId' });

// Etudiant <-> MoyenneMatiere
Etudiant.hasMany(MoyenneMatiere, { foreignKey: 'etudiantId' });
MoyenneMatiere.belongsTo(Etudiant, { foreignKey: 'etudiantId' });

// Matiere <-> MoyenneMatiere
Matiere.hasMany(MoyenneMatiere, { foreignKey: 'matiereId' });
MoyenneMatiere.belongsTo(Matiere, { foreignKey: 'matiereId' });

// Etudiant <-> MoyenneUE
Etudiant.hasMany(MoyenneUE, { foreignKey: 'etudiantId' });
MoyenneUE.belongsTo(Etudiant, { foreignKey: 'etudiantId' });

// UE <-> MoyenneUE
UE.hasMany(MoyenneUE, { foreignKey: 'ueId' });
MoyenneUE.belongsTo(UE, { foreignKey: 'ueId' });

// Etudiant <-> ResultatSemestre
Etudiant.hasMany(ResultatSemestre, { foreignKey: 'etudiantId' });
ResultatSemestre.belongsTo(Etudiant, { foreignKey: 'etudiantId' });

// Semestre <-> ResultatSemestre
Semestre.hasMany(ResultatSemestre, { foreignKey: 'semestreId' });
ResultatSemestre.belongsTo(Semestre, { foreignKey: 'semestreId' });

// Etudiant <-> ResultatAnnuel
Etudiant.hasMany(ResultatAnnuel, { foreignKey: 'etudiantId' });
ResultatAnnuel.belongsTo(Etudiant, { foreignKey: 'etudiantId' });


// Utilisateur <-> LogAudit
Utilisateur.hasMany(LogAudit, { foreignKey: 'utilisateurId' });
LogAudit.belongsTo(Utilisateur, { foreignKey: 'utilisateurId' });



module.exports = {
  sequelize,
  Utilisateur,
  Etudiant,
  Semestre,
  UE,
  Matiere,
  Evaluation,
  Absence,
  MoyenneMatiere,
  MoyenneUE,
  ResultatSemestre,
  ResultatAnnuel,
  LogAudit,
  Parametrage

};