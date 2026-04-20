'use strict';

const { Evaluation, Absence, MoyenneMatiere, MoyenneUE, ResultatSemestre, ResultatAnnuel, Matiere, UE, Semestre } = require('../models/index');

// Paramètres par défaut
const POIDS_CC = 0.4;
const POIDS_EXAMEN = 0.6;
const PENALITE_ABSENCE = 0.01;

// ==================== MOYENNE MATIERE ====================
const calculerMoyenneMatiere = async (etudiantId, matiereId) => {
  const evaluations = await Evaluation.findAll({
    where: { etudiantId, matiereId }
  });

  const cc = evaluations.find(e => e.type === 'CC');
  const examen = evaluations.find(e => e.type === 'EXAMEN');
  const rattrapage = evaluations.find(e => e.type === 'RATTRAPAGE');

  let moyenne = null;
  let rattrapageUtilise = false;

  if (rattrapage) {
    moyenne = rattrapage.note;
    rattrapageUtilise = true;
  } else if (cc && examen) {
    moyenne = (cc.note * POIDS_CC) + (examen.note * POIDS_EXAMEN);
  } else if (cc) {
    moyenne = cc.note;
  } else if (examen) {
    moyenne = examen.note;
  }

  // Pénalité absence
  if (moyenne !== null) {
    const absence = await Absence.findOne({ where: { etudiantId, matiereId } });
    if (absence && absence.heures > 0) {
      moyenne = Math.max(0, moyenne - (absence.heures * PENALITE_ABSENCE));
    }
  }

  if (moyenne !== null) moyenne = Math.round(moyenne * 100) / 100;

  // Forcer la mise à jour
  await MoyenneMatiere.findOrCreate({
    where: { etudiantId, matiereId },
    defaults: { moyenne, rattrapageUtilise }
  });
  await MoyenneMatiere.update(
    { moyenne, rattrapageUtilise },
    { where: { etudiantId, matiereId } }
  );

  return moyenne;
};

// ==================== MOYENNE UE ====================
const calculerMoyenneUE = async (etudiantId, ueId) => {
  const matieres = await Matiere.findAll({ where: { ueId } });

  let sommePonderee = 0;
  let sommeCoefficients = 0;

  for (const matiere of matieres) {
    const moyenne = await calculerMoyenneMatiere(etudiantId, matiere.id);
    if (moyenne !== null) {
      sommePonderee += moyenne * matiere.coefficient;
      sommeCoefficients += matiere.coefficient;
    }
  }

  const moyenneUE = sommeCoefficients > 0
    ? Math.round((sommePonderee / sommeCoefficients) * 100) / 100
    : null;

  const creditsUE = matieres.reduce((sum, m) => sum + m.credits, 0);

  await MoyenneUE.findOrCreate({
    where: { etudiantId, ueId },
    defaults: { moyenne: moyenneUE, creditsAcquis: 0, compense: false }
  });
  await MoyenneUE.update(
    {
      moyenne: moyenneUE,
      creditsAcquis: moyenneUE !== null && moyenneUE >= 10 ? creditsUE : 0,
      compense: false
    },
    { where: { etudiantId, ueId } }
  );

  return moyenneUE;
};

// ==================== MOYENNE SEMESTRE ====================
const calculerMoyenneSemestre = async (etudiantId, semestreId) => {
  const ues = await UE.findAll({ where: { semestreId } });

  const moyennesUE = [];
  for (const ue of ues) {
    const moyenne = await calculerMoyenneUE(etudiantId, ue.id);
    moyennesUE.push({ ue, moyenne });
  }

  // Calculer la moyenne de semestre
  let sommePonderee = 0;
  let sommeCredits = 0;

  for (const { ue, moyenne } of moyennesUE) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    const creditsUE = matieres.reduce((sum, m) => sum + m.credits, 0);
    if (moyenne !== null) {
      sommePonderee += moyenne * creditsUE;
      sommeCredits += creditsUE;
    }
  }

  const moyenneSemestre = sommeCredits > 0
    ? Math.round((sommePonderee / sommeCredits) * 100) / 100
    : null;

  // Appliquer les compensations et crédits
  let creditsTotal = 0;
  for (const { ue, moyenne } of moyennesUE) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    const creditsUE = matieres.reduce((sum, m) => sum + m.credits, 0);

    const acquisDirecte = moyenne !== null && moyenne >= 10;
    const acquisParCompensation = !acquisDirecte && moyenneSemestre !== null && moyenneSemestre >= 10;
    const compense = !acquisDirecte && acquisParCompensation;

    if (acquisDirecte || acquisParCompensation) {
      creditsTotal += creditsUE;
    }

    await MoyenneUE.findOrCreate({
      where: { etudiantId, ueId: ue.id },
      defaults: { moyenne, creditsAcquis: 0, compense: false }
    });
    await MoyenneUE.update(
      {
        moyenne,
        creditsAcquis: (acquisDirecte || acquisParCompensation) ? creditsUE : 0,
        compense
      },
      { where: { etudiantId, ueId: ue.id } }
    );
  }

  const valide = creditsTotal >= 30;

  await ResultatSemestre.findOrCreate({
    where: { etudiantId, semestreId },
    defaults: { moyenneSemestre, creditsTotal, valide }
  });
  await ResultatSemestre.update(
    { moyenneSemestre, creditsTotal, valide },
    { where: { etudiantId, semestreId } }
  );

  return { moyenneSemestre, creditsTotal, valide };
};

// ==================== RESULTAT ANNUEL ====================
const calculerResultatAnnuel = async (etudiantId, annee) => {
  const semestres = await Semestre.findAll();
  const s5 = semestres.find(s => s.libelle === 'S5');
  const s6 = semestres.find(s => s.libelle === 'S6');

  const resultatS5 = await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s5.id } });
  const resultatS6 = await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s6.id } });

  if (!resultatS5 || !resultatS6) return null;

  const moyenneAnnuelle = Math.round(
    ((resultatS5.moyenneSemestre + resultatS6.moyenneSemestre) / 2) * 100
  ) / 100;

  const creditsTotal = (resultatS5.creditsTotal || 0) + (resultatS6.creditsTotal || 0);

  // Décision jury
  let decisionJury = 'REDOUBLE';
  if (creditsTotal >= 60) {
    decisionJury = 'DIPLOME';
  } else if (resultatS5.valide && resultatS6.creditsTotal >= 22) {
    decisionJury = 'REPRISE_SOUTENANCE';
  }

  // Mention
  let mention = null;
  if (moyenneAnnuelle >= 16) mention = 'TRES_BIEN';
  else if (moyenneAnnuelle >= 14) mention = 'BIEN';
  else if (moyenneAnnuelle >= 12) mention = 'ASSEZ_BIEN';
  else if (moyenneAnnuelle >= 10) mention = 'PASSABLE';

  await ResultatAnnuel.upsert({
    etudiantId,
    annee,
    moyenneAnnuelle,
    decisionJury,
    mention
  });

  return { moyenneAnnuelle, creditsTotal, decisionJury, mention };
};

// ==================== RECALCUL EN CASCADE ====================
const recalculerTout = async (etudiantId, annee = '2025-2026') => {
  const semestres = await Semestre.findAll();
  const resultats = {};

  for (const semestre of semestres) {
    resultats[semestre.libelle] = await calculerMoyenneSemestre(etudiantId, semestre.id);
  }

  resultats.annuel = await calculerResultatAnnuel(etudiantId, annee);
  return resultats;
};

module.exports = {
  calculerMoyenneMatiere,
  calculerMoyenneUE,
  calculerMoyenneSemestre,
  calculerResultatAnnuel,
  recalculerTout
};