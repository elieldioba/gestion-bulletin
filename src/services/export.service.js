'use strict';

const ExcelJS = require('exceljs');
const { Etudiant, Semestre, UE, Matiere, Evaluation, MoyenneMatiere, MoyenneUE, ResultatSemestre, ResultatAnnuel } = require('../models/index');

// ==================== EXPORT RELEVE DE NOTES PAR SEMESTRE ====================
const exporterReleveNotesSemestre = async (semestreId) => {
  const workbook = new ExcelJS.Workbook();
  const semestre = await Semestre.findByPk(semestreId);
  const sheet = workbook.addWorksheet(`Relevé ${semestre.libelle}`);

  const ues = await UE.findAll({ where: { semestreId } });
  const etudiants = await Etudiant.findAll({ order: [['nom', 'ASC']] });

  // Construire les colonnes dynamiquement
  const colonnes = [
    { header: 'Nom', key: 'nom', width: 15 },
    { header: 'Prénom', key: 'prenom', width: 15 }
  ];

  const matieresList = [];
  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    for (const matiere of matieres) {
      matieresList.push(matiere);
      colonnes.push({
        header: `${matiere.libelle} (CC)`,
        key: `m${matiere.id}_cc`,
        width: 18
      });
      colonnes.push({
        header: `${matiere.libelle} (Exam)`,
        key: `m${matiere.id}_exam`,
        width: 18
      });
      colonnes.push({
        header: `${matiere.libelle} (Moy)`,
        key: `m${matiere.id}_moy`,
        width: 18
      });
    }
    colonnes.push({
      header: `Moy ${ue.code}`,
      key: `ue${ue.id}_moy`,
      width: 15
    });
  }

  colonnes.push(
    { header: 'Moy Semestre', key: 'moySemestre', width: 15 },
    { header: 'Crédits', key: 'credits', width: 10 },
    { header: 'Décision', key: 'decision', width: 15 }
  );

  sheet.columns = colonnes;

  // Style en-tête
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  sheet.getRow(1).height = 40;

  // Remplir les données
  for (const etudiant of etudiants) {
    const rowData = {
      nom: etudiant.nom,
      prenom: etudiant.prenom
    };

    for (const matiere of matieresList) {
      const evaluations = await Evaluation.findAll({
        where: { etudiantId: etudiant.id, matiereId: matiere.id }
      });
      const cc = evaluations.find(e => e.type === 'CC');
      const exam = evaluations.find(e => e.type === 'EXAMEN');
      const moyMatiere = await MoyenneMatiere.findOne({
        where: { etudiantId: etudiant.id, matiereId: matiere.id }
      });

      rowData[`m${matiere.id}_cc`] = cc ? cc.note : '-';
      rowData[`m${matiere.id}_exam`] = exam ? exam.note : '-';
      rowData[`m${matiere.id}_moy`] = moyMatiere ? moyMatiere.moyenne : '-';
    }

    for (const ue of ues) {
      const moyUE = await MoyenneUE.findOne({
        where: { etudiantId: etudiant.id, ueId: ue.id }
      });
      rowData[`ue${ue.id}_moy`] = moyUE ? moyUE.moyenne : '-';
    }

    const resultat = await ResultatSemestre.findOne({
      where: { etudiantId: etudiant.id, semestreId }
    });

    rowData.moySemestre = resultat ? resultat.moyenneSemestre : '-';
    rowData.credits = resultat ? `${resultat.creditsTotal}/30` : '-';
    rowData.decision = resultat ? (resultat.valide ? 'Validé' : 'Non validé') : '-';

    const row = sheet.addRow(rowData);

    // Colorer selon résultat
    if (resultat) {
      const couleur = resultat.valide ? 'FFD5F5E3' : 'FFFDE8E8';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: couleur } };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center' };
      });
    }
  }

  return workbook;
};

// ==================== EXPORT DECISIONS JURY ====================
const exporterDecisionsJury = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Décisions Jury');

  sheet.columns = [
    { header: 'Nom', key: 'nom', width: 15 },
    { header: 'Prénom', key: 'prenom', width: 15 },
    { header: 'Moy S5', key: 'moyS5', width: 12 },
    { header: 'Crédits S5', key: 'creditsS5', width: 12 },
    { header: 'Moy S6', key: 'moyS6', width: 12 },
    { header: 'Crédits S6', key: 'creditsS6', width: 12 },
    { header: 'Moy Annuelle', key: 'moyAnnuelle', width: 14 },
    { header: 'Crédits Total', key: 'creditsTotal', width: 14 },
    { header: 'Mention', key: 'mention', width: 14 },
    { header: 'Décision Jury', key: 'decision', width: 20 }
  ];

  // Style en-tête
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });
  sheet.getRow(1).height = 25;

  const etudiants = await Etudiant.findAll({ order: [['nom', 'ASC']] });
  const semestres = await Semestre.findAll();
  const s5 = semestres.find(s => s.libelle === 'S5');
  const s6 = semestres.find(s => s.libelle === 'S6');

  for (const etudiant of etudiants) {
    const resultatS5 = await ResultatSemestre.findOne({
      where: { etudiantId: etudiant.id, semestreId: s5.id }
    });
    const resultatS6 = await ResultatSemestre.findOne({
      where: { etudiantId: etudiant.id, semestreId: s6.id }
    });
    const resultatAnnuel = await ResultatAnnuel.findOne({
      where: { etudiantId: etudiant.id }
    });

    const decision = resultatAnnuel?.decisionJury === 'DIPLOME'
      ? 'DIPLÔMÉ(E)'
      : resultatAnnuel?.decisionJury === 'REPRISE_SOUTENANCE'
      ? 'REPRISE SOUTENANCE'
      : resultatAnnuel?.decisionJury === 'REDOUBLE'
      ? 'REDOUBLE'
      : 'N/A';

    const mention = resultatAnnuel?.mention
      ? resultatAnnuel.mention.replace('_', ' ')
      : 'N/A';

    const row = sheet.addRow({
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      moyS5: resultatS5?.moyenneSemestre || '-',
      creditsS5: resultatS5 ? `${resultatS5.creditsTotal}/30` : '-',
      moyS6: resultatS6?.moyenneSemestre || '-',
      creditsS6: resultatS6 ? `${resultatS6.creditsTotal}/30` : '-',
      moyAnnuelle: resultatAnnuel?.moyenneAnnuelle || '-',
      creditsTotal: resultatAnnuel ? `${(resultatS5?.creditsTotal || 0) + (resultatS6?.creditsTotal || 0)}/60` : '-',
      mention,
      decision
    });

    // Couleur selon décision
    const couleur = resultatAnnuel?.decisionJury === 'DIPLOME'
      ? 'FFD5F5E3'
      : resultatAnnuel?.decisionJury === 'REPRISE_SOUTENANCE'
      ? 'FFFFF3CD'
      : 'FFFDE8E8';

    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: couleur } };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center' };
    });
  }

  return workbook;
};

module.exports = { exporterReleveNotesSemestre, exporterDecisionsJury };