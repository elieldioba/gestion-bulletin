'use strict';

const PDFDocument = require('pdfkit');
const { Etudiant, Semestre, UE, Matiere, Evaluation, MoyenneMatiere, MoyenneUE, ResultatSemestre, ResultatAnnuel, Absence } = require('../models/index');



// Calcul des statistiques de promotion pour un semestre
const getStatistiquesPromotion = async (semestreId) => {
  const { ResultatSemestre, Etudiant } = require('../models/index');
  const etudiants = await Etudiant.findAll();
  const moyennes = [];

  for (const etudiant of etudiants) {
    const resultat = await ResultatSemestre.findOne({
      where: { etudiantId: etudiant.id, semestreId }
    });
    if (resultat && resultat.moyenneSemestre !== null) {
      moyennes.push(resultat.moyenneSemestre);
    }
  }

  if (moyennes.length === 0) return null;

  const moyenneClasse = Math.round((moyennes.reduce((a, b) => a + b, 0) / moyennes.length) * 100) / 100;
  const min = Math.min(...moyennes);
  const max = Math.max(...moyennes);
  const variance = moyennes.reduce((sum, v) => sum + Math.pow(v - moyenneClasse, 2), 0) / moyennes.length;
  const ecartType = Math.round(Math.sqrt(variance) * 100) / 100;

  return { moyenneClasse, min, max, ecartType, nombreEtudiants: moyennes.length };
};


const genererBulletinSemestre = async (etudiantId, semestreId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestre = await Semestre.findByPk(semestreId);
  const ues = await UE.findAll({ where: { semestreId } });
  const resultat = await ResultatSemestre.findOne({ where: { etudiantId, semestreId } });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const buffers = [];

  doc.on('data', chunk => buffers.push(chunk));

  // ===== EN-TETE =====
  doc.fontSize(14).font('Helvetica-Bold')
     .text('INSTITUT NATIONAL DE LA POSTE ET DES TIC', { align: 'center' });
  doc.fontSize(12).font('Helvetica')
     .text('Licence Professionnelle ASUR', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(16).font('Helvetica-Bold')
     .text(`BULLETIN DE NOTES — ${semestre.libelle}`, { align: 'center' });
  doc.text(`Année universitaire : ${semestre.anneeUniversitaire}`, { align: 'center' });
  doc.moveDown();

  // ===== INFOS ETUDIANT =====
  doc.fontSize(11).font('Helvetica-Bold').text('INFORMATIONS ÉTUDIANT');
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(10);
  doc.text(`Nom : ${etudiant.nom}     Prénom : ${etudiant.prenom}`, 40);
  doc.text(`Date de naissance : ${etudiant.dateNaissance || 'N/A'}     Lieu : ${etudiant.lieuNaissance || 'N/A'}`);
  doc.text(`Baccalauréat : ${etudiant.typeBac || 'N/A'}     Établissement d'origine : ${etudiant.provenance || 'N/A'}`);
  doc.moveDown();

  // ===== TABLEAU DES NOTES =====
  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    const moyenneUE = await MoyenneUE.findOne({ where: { etudiantId, ueId: ue.id } });

    // En-tête UE
    doc.fontSize(10).font('Helvetica-Bold')
       .fillColor('#1a1a2e')
       .text(`${ue.code} — ${ue.libelle}`, 40);

    // En-tête tableau
    const y = doc.y + 5;
    doc.fillColor('#2c3e50').rect(40, y, 515, 18).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Matière', 45, y + 4, { width: 200 });
    doc.text('Coef', 250, y + 4, { width: 40, align: 'center' });
    doc.text('CC', 295, y + 4, { width: 45, align: 'center' });
    doc.text('Examen', 340, y + 4, { width: 55, align: 'center' });
    doc.text('Rattrapage', 395, y + 4, { width: 60, align: 'center' });
    doc.text('Moyenne', 455, y + 4, { width: 55, align: 'center' });
    doc.text('Crédits', 510, y + 4, { width: 40, align: 'center' });

    doc.moveDown(0.1);
    let rowY = y + 20;

    for (let i = 0; i < matieres.length; i++) {
      const matiere = matieres[i];
      const evaluations = await Evaluation.findAll({ where: { etudiantId, matiereId: matiere.id } });
      const moyenneMatiere = await MoyenneMatiere.findOne({ where: { etudiantId, matiereId: matiere.id } });

      const cc = evaluations.find(e => e.type === 'CC');
      const examen = evaluations.find(e => e.type === 'EXAMEN');
      const rattrapage = evaluations.find(e => e.type === 'RATTRAPAGE');

      const bgColor = i % 2 === 0 ? '#f8f9fa' : 'white';
      doc.fillColor(bgColor).rect(40, rowY, 515, 16).fill();
      doc.fillColor('#333333').fontSize(8).font('Helvetica');

      doc.text(matiere.libelle, 45, rowY + 3, { width: 200 });
      doc.text(matiere.coefficient.toString(), 250, rowY + 3, { width: 40, align: 'center' });
      doc.text(cc ? cc.note.toFixed(2) : '-', 295, rowY + 3, { width: 45, align: 'center' });
      doc.text(examen ? examen.note.toFixed(2) : '-', 340, rowY + 3, { width: 55, align: 'center' });
      doc.text(rattrapage ? rattrapage.note.toFixed(2) : '-', 395, rowY + 3, { width: 60, align: 'center' });

      const moy = moyenneMatiere ? moyenneMatiere.moyenne : null;
      const couleurMoy = moy !== null && moy >= 10 ? '#27ae60' : '#e74c3c';
      doc.fillColor(couleurMoy).font('Helvetica-Bold')
         .text(moy !== null ? moy.toFixed(2) : '-', 455, rowY + 3, { width: 55, align: 'center' });

      doc.fillColor('#333333').font('Helvetica')
         .text(matiere.credits.toString(), 510, rowY + 3, { width: 40, align: 'center' });

      // Bordure ligne
      doc.moveTo(40, rowY + 16).lineTo(555, rowY + 16).strokeColor('#dddddd').stroke();
      rowY += 16;
    }

    // Ligne moyenne UE
    doc.fillColor('#ecf0f1').rect(40, rowY, 515, 18).fill();
    doc.fillColor('#2c3e50').fontSize(9).font('Helvetica-Bold');
    doc.text(`Moyenne ${ue.code}`, 45, rowY + 4, { width: 280 });

    const moyUE = moyenneUE ? moyenneUE.moyenne : null;
    const couleurUE = moyUE !== null && moyUE >= 10 ? '#27ae60' : '#e74c3c';
    doc.fillColor(couleurUE)
       .text(moyUE !== null ? moyUE.toFixed(2) : '-', 455, rowY + 4, { width: 55, align: 'center' });

    const statut = moyenneUE
      ? (moyenneUE.compense ? 'Compensée' : moyenneUE.creditsAcquis > 0 ? 'Acquise' : 'Non acquise')
      : '-';
    doc.fillColor('#2c3e50')
       .text(`Crédits : ${moyenneUE ? moyenneUE.creditsAcquis : 0} — ${statut}`, 45, rowY + 4, { width: 280, align: 'right' });

    doc.moveDown(0.3);
    rowY += 25;
    doc.y = rowY;
    doc.moveDown(0.5);
  }

  // ===== ABSENCES =====
  const absencesEtudiant = [];
  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    for (const matiere of matieres) {
      const absence = await Absence.findOne({ where: { etudiantId, matiereId: matiere.id } });
      if (absence && absence.heures > 0) {
        absencesEtudiant.push({ matiere: matiere.libelle, heures: absence.heures });
      }
    }
  }

  if (absencesEtudiant.length > 0) {
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e74c3c').lineWidth(1).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#e74c3c').text('ABSENCES');
    doc.moveDown(0.3);

    const yAbs = doc.y;
    doc.fillColor('#e74c3c').rect(40, yAbs, 515, 18).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Matière', 45, yAbs + 4, { width: 400 });
    doc.text('Heures', 450, yAbs + 4, { width: 100, align: 'center' });

    let rowAbsY = yAbs + 20;
    for (let i = 0; i < absencesEtudiant.length; i++) {
      const abs = absencesEtudiant[i];
      doc.fillColor(i % 2 === 0 ? '#fdf2f2' : 'white').rect(40, rowAbsY, 515, 16).fill();
      doc.fillColor('#333333').fontSize(8).font('Helvetica');
      doc.text(abs.matiere, 45, rowAbsY + 3, { width: 400 });
      doc.text(`${abs.heures}h`, 450, rowAbsY + 3, { width: 100, align: 'center' });
      doc.moveTo(40, rowAbsY + 16).lineTo(555, rowAbsY + 16).strokeColor('#dddddd').stroke();
      rowAbsY += 16;
    }
    doc.moveDown(3);
    doc.y = rowAbsY + 10;
  }

 // ===== RESULTAT SEMESTRE =====
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#2c3e50').lineWidth(2).stroke();
  doc.moveDown(0.3);

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e');
  doc.text('RÉSULTAT DU SEMESTRE', 40);
  doc.moveDown(0.3);

  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  if (resultat) {
    doc.text(`Moyenne générale : ${resultat.moyenneSemestre !== null ? resultat.moyenneSemestre.toFixed(2) + '/20' : 'N/A'}`, 40);
    doc.text(`Crédits acquis : ${resultat.creditsTotal} / 30`);
    doc.text(`Décision : ${resultat.valide ? 'Semestre VALIDE' : 'Semestre NON VALIDE'}`);
  } else {
    doc.text('Résultats non disponibles.');
  }

  // ===== STATISTIQUES PROMOTION =====
  const stats = await getStatistiquesPromotion(semestreId);
  if (stats) {
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#2c3e50').lineWidth(1).stroke();
    doc.moveDown(0.3);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('STATISTIQUES DE LA PROMOTION');
    doc.moveDown(0.3);

    // Tableau stats
    const yStats = doc.y;
    doc.fillColor('#2c3e50').rect(40, yStats, 515, 18).fill();
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
    doc.text('Nb Étudiants', 45, yStats + 4, { width: 100, align: 'center' });
    doc.text('Moyenne Classe', 150, yStats + 4, { width: 110, align: 'center' });
    doc.text('Minimum', 265, yStats + 4, { width: 90, align: 'center' });
    doc.text('Maximum', 360, yStats + 4, { width: 90, align: 'center' });
    doc.text('Écart-Type', 455, yStats + 4, { width: 90, align: 'center' });

    const yStatsRow = yStats + 20;
    doc.fillColor('#f8f9fa').rect(40, yStatsRow, 515, 18).fill();
    doc.fillColor('#333333').fontSize(9).font('Helvetica');
    doc.text(stats.nombreEtudiants.toString(), 45, yStatsRow + 4, { width: 100, align: 'center' });
    doc.text(stats.moyenneClasse.toFixed(2), 150, yStatsRow + 4, { width: 110, align: 'center' });
    doc.text(stats.min.toFixed(2), 265, yStatsRow + 4, { width: 90, align: 'center' });
    doc.text(stats.max.toFixed(2), 360, yStatsRow + 4, { width: 90, align: 'center' });
    doc.text(stats.ecartType.toFixed(2), 455, yStatsRow + 4, { width: 90, align: 'center' });

    doc.moveTo(40, yStatsRow + 18).lineTo(555, yStatsRow + 18).strokeColor('#dddddd').stroke();
    doc.moveDown(3);
  }

  // ===== PIED DE PAGE =====
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#888888')
     .text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — INPTIC LP ASUR`, { align: 'center' });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
};

const genererBulletinAnnuel = async (etudiantId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestres = await Semestre.findAll();
  const s5 = semestres.find(s => s.libelle === 'S5');
  const s6 = semestres.find(s => s.libelle === 'S6');

  const resultatS5 = await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s5.id } });
  const resultatS6 = await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s6.id } });
  const resultatAnnuel = await ResultatAnnuel.findOne({ where: { etudiantId } });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  // ===== EN-TETE =====
  doc.fontSize(14).font('Helvetica-Bold')
     .text('INSTITUT NATIONAL DE LA POSTE ET DES TIC', { align: 'center' });
  doc.fontSize(12).font('Helvetica')
     .text('Licence Professionnelle ASUR', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold')
     .text('BULLETIN ANNUEL', { align: 'center' });
  doc.text(`Année universitaire : ${s5 ? s5.anneeUniversitaire : '2025-2026'}`, { align: 'center' });
  doc.moveDown();

  // ===== INFOS ETUDIANT =====
  doc.fontSize(11).font('Helvetica-Bold').text('INFORMATIONS ÉTUDIANT');
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Nom : ${etudiant.nom}     Prénom : ${etudiant.prenom}`);
  doc.text(`Date de naissance : ${etudiant.dateNaissance || 'N/A'}     Lieu : ${etudiant.lieuNaissance || 'N/A'}`);
  doc.text(`Baccalauréat : ${etudiant.typeBac || 'N/A'}     Établissement : ${etudiant.provenance || 'N/A'}`);
  doc.moveDown();

  // ===== RESULTATS PAR SEMESTRE =====
  doc.fontSize(11).font('Helvetica-Bold').text('RÉSULTATS PAR SEMESTRE');
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // Tableau semestres
  const yTab = doc.y;
  doc.fillColor('#2c3e50').rect(40, yTab, 515, 20).fill();
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
  doc.text('Semestre', 45, yTab + 5, { width: 150 });
  doc.text('Moyenne', 200, yTab + 5, { width: 100, align: 'center' });
  doc.text('Crédits', 310, yTab + 5, { width: 80, align: 'center' });
  doc.text('Décision', 400, yTab + 5, { width: 150, align: 'center' });

  // S5
  let rowY = yTab + 22;
  doc.fillColor('#f8f9fa').rect(40, rowY, 515, 18).fill();
  doc.fillColor('#333333').fontSize(10).font('Helvetica');
  doc.text('Semestre 5', 45, rowY + 3);
  doc.text(resultatS5 ? `${resultatS5.moyenneSemestre}/20` : 'N/A', 200, rowY + 3, { width: 100, align: 'center' });
  doc.text(resultatS5 ? `${resultatS5.creditsTotal}/30` : 'N/A', 310, rowY + 3, { width: 80, align: 'center' });
  doc.text(resultatS5 ? (resultatS5.valide ? 'Validé' : 'Non validé') : 'N/A', 400, rowY + 3, { width: 150, align: 'center' });

  // S6
  rowY += 20;
  doc.fillColor('white').rect(40, rowY, 515, 18).fill();
  doc.fillColor('#333333');
  doc.text('Semestre 6', 45, rowY + 3);
  doc.text(resultatS6 ? `${resultatS6.moyenneSemestre}/20` : 'N/A', 200, rowY + 3, { width: 100, align: 'center' });
  doc.text(resultatS6 ? `${resultatS6.creditsTotal}/30` : 'N/A', 310, rowY + 3, { width: 80, align: 'center' });
  doc.text(resultatS6 ? (resultatS6.valide ? 'Validé' : 'Non validé') : 'N/A', 400, rowY + 3, { width: 150, align: 'center' });

  doc.moveDown(4);

  // ===== RESULTAT ANNUEL =====
  doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#2c3e50').lineWidth(2).stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e').text('RÉSULTAT ANNUEL');
  doc.moveDown(0.3);

  doc.fontSize(11).font('Helvetica').fillColor('#333333');
  if (resultatAnnuel) {
    doc.text(`Moyenne annuelle : ${resultatAnnuel.moyenneAnnuelle}/20`);
    doc.text(`Crédits totaux : ${(resultatS5?.creditsTotal || 0) + (resultatS6?.creditsTotal || 0)}/60`);
    doc.moveDown(0.3);

    const mention = resultatAnnuel.mention
      ? resultatAnnuel.mention.replace('_', ' ')
      : 'N/A';
    doc.fontSize(12).font('Helvetica-Bold')
       .text(`Mention : ${mention}`);

    const decision = resultatAnnuel.decisionJury === 'DIPLOME'
      ? 'DIPLÔMÉ(E)'
      : resultatAnnuel.decisionJury === 'REPRISE_SOUTENANCE'
      ? 'REPRISE DE SOUTENANCE'
      : 'REDOUBLE LA LICENCE 3';

    const couleur = resultatAnnuel.decisionJury === 'DIPLOME' ? '#27ae60' : '#e74c3c';
    doc.fillColor(couleur).fontSize(14).font('Helvetica-Bold')
       .text(`Décision du jury : ${decision}`, { align: 'center' });
  } else {
    doc.text('Résultats annuels non disponibles.');
  }

  // ===== SIGNATURES =====
  doc.moveDown(3);
  doc.fillColor('#333333').fontSize(10).font('Helvetica');
  doc.text('Le Responsable pédagogique', 80, doc.y, { width: 180, align: 'center' });
  doc.text('Le Chef de département', 320, doc.y - doc.currentLineHeight(), { width: 180, align: 'center' });
  doc.moveDown(2);
  doc.text('Signature : _______________', 80, doc.y, { width: 180, align: 'center' });
  doc.text('Signature : _______________', 320, doc.y - doc.currentLineHeight(), { width: 180, align: 'center' });

  // ===== PIED DE PAGE =====
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#888888')
     .text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — INPTIC LP ASUR`, { align: 'center' });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
};


const genererBulletinHTML = async (etudiantId, semestreId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestre = await Semestre.findByPk(semestreId);
  const ues = await UE.findAll({ where: { semestreId } });
  const resultat = await ResultatSemestre.findOne({ where: { etudiantId, semestreId } });
  const stats = await getStatistiquesPromotion(semestreId);

  let lignesUE = '';

  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    const moyenneUE = await MoyenneUE.findOne({ where: { etudiantId, ueId: ue.id } });

    let lignesMatieres = '';
    for (const matiere of matieres) {
      const evaluations = await Evaluation.findAll({ where: { etudiantId, matiereId: matiere.id } });
      const moyenneMatiere = await MoyenneMatiere.findOne({ where: { etudiantId, matiereId: matiere.id } });

      const cc = evaluations.find(e => e.type === 'CC');
      const examen = evaluations.find(e => e.type === 'EXAMEN');
      const rattrapage = evaluations.find(e => e.type === 'RATTRAPAGE');
      const moy = moyenneMatiere ? moyenneMatiere.moyenne : null;
      const couleur = moy !== null ? (moy >= 10 ? '#27ae60' : '#e74c3c') : '#333';

      lignesMatieres += `
        <tr>
          <td>${matiere.libelle}</td>
          <td>${matiere.coefficient}</td>
          <td>${cc ? cc.note.toFixed(2) : '-'}</td>
          <td>${examen ? examen.note.toFixed(2) : '-'}</td>
          <td>${rattrapage ? rattrapage.note.toFixed(2) : '-'}</td>
          <td style="color:${couleur}; font-weight:bold">${moy !== null ? moy.toFixed(2) : '-'}</td>
          <td>${matiere.credits}</td>
        </tr>`;
    }

    const moyUE = moyenneUE ? moyenneUE.moyenne : null;
    const statutUE = moyenneUE
      ? (moyenneUE.compense ? 'Compensée' : moyenneUE.creditsAcquis > 0 ? 'Acquise' : 'Non acquise')
      : '-';

    lignesUE += `
      <tr class="ue-header">
        <td colspan="7">${ue.code} — ${ue.libelle}</td>
      </tr>
      ${lignesMatieres}
      <tr class="ue-footer">
        <td colspan="5">Moyenne ${ue.code} — ${statutUE}</td>
        <td>${moyUE !== null ? moyUE.toFixed(2) : '-'}</td>
        <td>${moyenneUE ? moyenneUE.creditsAcquis : 0}</td>
      </tr>`;
  }

  const statsHTML = stats ? `
    <h3>Statistiques de la Promotion</h3>
    <table>
      <thead>
        <tr>
          <th>Nb Étudiants</th>
          <th>Moyenne Classe</th>
          <th>Minimum</th>
          <th>Maximum</th>
          <th>Écart-Type</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${stats.nombreEtudiants}</td>
          <td>${stats.moyenneClasse.toFixed(2)}</td>
          <td>${stats.min.toFixed(2)}</td>
          <td>${stats.max.toFixed(2)}</td>
          <td>${stats.ecartType.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>` : '';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin ${semestre.libelle} — ${etudiant.nom} ${etudiant.prenom}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
    h1, h2 { text-align: center; }
    h1 { color: #1a1a2e; font-size: 18px; }
    h2 { color: #2c3e50; font-size: 14px; }
    h3 { color: #2c3e50; font-size: 13px; border-bottom: 2px solid #2c3e50; padding-bottom: 5px; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .info-box p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #2c3e50; color: white; padding: 8px; text-align: center; }
    td { padding: 6px 8px; border: 1px solid #ddd; text-align: center; }
    tr:nth-child(even) { background: #f8f9fa; }
    .ue-header { background: #1a1a2e !important; color: white; font-weight: bold; }
    .ue-header td { color: white; text-align: left; }
    .ue-footer { background: #ecf0f1 !important; font-weight: bold; }
    .resultat { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .valide { color: #27ae60; font-weight: bold; }
    .non-valide { color: #e74c3c; font-weight: bold; }
    .footer { text-align: center; color: #888; font-size: 11px; margin-top: 30px; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>INSTITUT NATIONAL DE LA POSTE ET DES TIC</h1>
  <h2>Licence Professionnelle ASUR</h2>
  <h2>BULLETIN DE NOTES — ${semestre.libelle} | Année : ${semestre.anneeUniversitaire}</h2>

  <div class="info-box">
    <p><strong>Nom :</strong> ${etudiant.nom} &nbsp;&nbsp; <strong>Prénom :</strong> ${etudiant.prenom}</p>
    <p><strong>Date de naissance :</strong> ${etudiant.dateNaissance || 'N/A'} &nbsp;&nbsp; <strong>Lieu :</strong> ${etudiant.lieuNaissance || 'N/A'}</p>
    <p><strong>Baccalauréat :</strong> ${etudiant.typeBac || 'N/A'} &nbsp;&nbsp; <strong>Établissement :</strong> ${etudiant.provenance || 'N/A'}</p>
  </div>

  <h3>Notes et Résultats</h3>
  <table>
    <thead>
      <tr>
        <th>Matière</th><th>Coef</th><th>CC</th>
        <th>Examen</th><th>Rattrapage</th><th>Moyenne</th><th>Crédits</th>
      </tr>
    </thead>
    <tbody>${lignesUE}</tbody>
  </table>

  <div class="resultat">
    <h3>Résultat du Semestre</h3>
    <p><strong>Moyenne générale :</strong> ${resultat ? resultat.moyenneSemestre + '/20' : 'N/A'}</p>
    <p><strong>Crédits acquis :</strong> ${resultat ? resultat.creditsTotal : 0} / 30</p>
    <p><strong>Décision :</strong>
      <span class="${resultat?.valide ? 'valide' : 'non-valide'}">
        ${resultat?.valide ? 'Semestre VALIDE' : 'Semestre NON VALIDE'}
      </span>
    </p>
  </div>

  ${statsHTML}

  <div class="footer">
    Document généré le ${new Date().toLocaleDateString('fr-FR')} — INPTIC LP ASUR
  </div>
</body>
</html>`;

  return html;
};

const genererBulletinAnnuelHTML = async (etudiantId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestres = await Semestre.findAll();
  const s5 = semestres.find(s => s.libelle === 'S5');
  const s6 = semestres.find(s => s.libelle === 'S6');

  const resultatS5 = await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s5.id } });
  const resultatS6 = await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s6.id } });
  const resultatAnnuel = await ResultatAnnuel.findOne({ where: { etudiantId } });

  const decision = resultatAnnuel?.decisionJury === 'DIPLOME' ? 'DIPLÔMÉ(E)'
    : resultatAnnuel?.decisionJury === 'REPRISE_SOUTENANCE' ? 'REPRISE DE SOUTENANCE'
    : 'REDOUBLE LA LICENCE 3';

  const mention = resultatAnnuel?.mention ? resultatAnnuel.mention.replace('_', ' ') : 'N/A';
  const couleurDecision = resultatAnnuel?.decisionJury === 'DIPLOME' ? '#27ae60' : '#e74c3c';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin Annuel — ${etudiant.nom} ${etudiant.prenom}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
    h1, h2 { text-align: center; }
    h1 { color: #1a1a2e; font-size: 18px; }
    h2 { color: #2c3e50; font-size: 14px; }
    h3 { color: #2c3e50; font-size: 13px; border-bottom: 2px solid #2c3e50; padding-bottom: 5px; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #2c3e50; color: white; padding: 8px; text-align: center; }
    td { padding: 6px 8px; border: 1px solid #ddd; text-align: center; }
    tr:nth-child(even) { background: #f8f9fa; }
    .decision { text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid ${couleurDecision}; }
    .decision h2 { color: ${couleurDecision}; font-size: 20px; margin: 0; }
    .footer { text-align: center; color: #888; font-size: 11px; margin-top: 30px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature { text-align: center; width: 200px; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>INSTITUT NATIONAL DE LA POSTE ET DES TIC</h1>
  <h2>Licence Professionnelle ASUR</h2>
  <h2>BULLETIN ANNUEL | Année : ${s5?.anneeUniversitaire || '2025-2026'}</h2>

  <div class="info-box">
    <p><strong>Nom :</strong> ${etudiant.nom} &nbsp;&nbsp; <strong>Prénom :</strong> ${etudiant.prenom}</p>
    <p><strong>Date de naissance :</strong> ${etudiant.dateNaissance || 'N/A'} &nbsp;&nbsp; <strong>Lieu :</strong> ${etudiant.lieuNaissance || 'N/A'}</p>
    <p><strong>Baccalauréat :</strong> ${etudiant.typeBac || 'N/A'} &nbsp;&nbsp; <strong>Établissement :</strong> ${etudiant.provenance || 'N/A'}</p>
  </div>

  <h3>Résultats par Semestre</h3>
  <table>
    <thead>
      <tr><th>Semestre</th><th>Moyenne</th><th>Crédits</th><th>Décision</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Semestre 5</td>
        <td>${resultatS5?.moyenneSemestre ? resultatS5.moyenneSemestre + '/20' : 'N/A'}</td>
        <td>${resultatS5 ? resultatS5.creditsTotal + '/30' : 'N/A'}</td>
        <td style="color:${resultatS5?.valide ? '#27ae60' : '#e74c3c'}">${resultatS5?.valide ? 'Validé' : 'Non validé'}</td>
      </tr>
      <tr>
        <td>Semestre 6</td>
        <td>${resultatS6?.moyenneSemestre ? resultatS6.moyenneSemestre + '/20' : 'N/A'}</td>
        <td>${resultatS6 ? resultatS6.creditsTotal + '/30' : 'N/A'}</td>
        <td style="color:${resultatS6?.valide ? '#27ae60' : '#e74c3c'}">${resultatS6?.valide ? 'Validé' : 'Non validé'}</td>
      </tr>
    </tbody>
  </table>

  <h3>Résultat Annuel</h3>
  <table>
    <thead>
      <tr><th>Moyenne Annuelle</th><th>Crédits Total</th><th>Mention</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${resultatAnnuel?.moyenneAnnuelle ? resultatAnnuel.moyenneAnnuelle + '/20' : 'N/A'}</td>
        <td>${(resultatS5?.creditsTotal || 0) + (resultatS6?.creditsTotal || 0)}/60</td>
        <td>${mention}</td>
      </tr>
    </tbody>
  </table>

  <div class="decision">
    <h2>Décision du Jury : ${decision}</h2>
  </div>

  <div class="signatures">
    <div class="signature">
      <p>Le Responsable pédagogique</p>
      <br><br>
      <p>Signature : _______________</p>
    </div>
    <div class="signature">
      <p>Le Chef de département</p>
      <br><br>
      <p>Signature : _______________</p>
    </div>
  </div>

  <div class="footer">
    Document généré le ${new Date().toLocaleDateString('fr-FR')} — INPTIC LP ASUR
  </div>
</body>
</html>`;

  return html;
};

module.exports = { genererBulletinSemestre, genererBulletinAnnuel, genererBulletinHTML, genererBulletinAnnuelHTML };



