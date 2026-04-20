'use strict';

const PDFDocument = require('pdfkit');
const { Etudiant, Semestre, UE, Matiere, Evaluation, MoyenneMatiere, MoyenneUE, ResultatSemestre, ResultatAnnuel } = require('../models/index');

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

module.exports = { genererBulletinSemestre, genererBulletinAnnuel };

