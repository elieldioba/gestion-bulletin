'use strict';

const PDFDocument = require('pdfkit');
const { Etudiant, Semestre, UE, Matiere, Evaluation, MoyenneMatiere, MoyenneUE, ResultatSemestre, ResultatAnnuel, Absence } = require('../models/index');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const fmt = (v, dec = 2) => {
  if (v === null || v === undefined || isNaN(v)) return '-';
  const n = parseFloat(v);
  if (isNaN(n)) return '-';
  return n.toFixed(dec);
};

const getRang = async (etudiantId, semestreId) => {
  const tous = await ResultatSemestre.findAll({ where: { semestreId } });
  const tries = tous
    .filter(r => r.moyenneSemestre !== null)
    .sort((a, b) => b.moyenneSemestre - a.moyenneSemestre);
  const pos = tries.findIndex(r => r.etudiantId === etudiantId);
  return pos === -1 ? null : pos + 1;
};

const getRangAnnuel = async (etudiantId) => {
  const tous = await ResultatAnnuel.findAll();
  const tries = tous
    .filter(r => r.moyenneAnnuelle !== null)
    .sort((a, b) => b.moyenneAnnuelle - a.moyenneAnnuelle);
  const pos = tries.findIndex(r => r.etudiantId === etudiantId);
  return pos === -1 ? null : pos + 1;
};

const getMoyenneClasseSemestre = async (semestreId) => {
  const tous = await ResultatSemestre.findAll({ where: { semestreId } });
  const valeurs = tous.filter(r => r.moyenneSemestre !== null).map(r => r.moyenneSemestre);
  if (!valeurs.length) return null;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
};

const getMoyenneClasseUE = async (ueId) => {
  const tous = await MoyenneUE.findAll({ where: { ueId } });
  const valeurs = tous.filter(r => r.moyenne !== null).map(r => r.moyenne);
  if (!valeurs.length) return null;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
};

const getMoyenneClasseMatiere = async (matiereId) => {
  const tous = await MoyenneMatiere.findAll({ where: { matiereId } });
  const valeurs = tous.filter(r => r.moyenne !== null).map(r => r.moyenne);
  if (!valeurs.length) return null;
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
};

const getMention = (moy) => {
  if (moy === null) return 'N/A';
  if (moy >= 16) return 'Très Bien';
  if (moy >= 14) return 'Bien';
  if (moy >= 12) return 'Assez Bien';
  if (moy >= 10) return 'Passable';
  return 'Insuffisant';
};

// ─────────────────────────────────────────────
// DESSIN UTILITAIRE
// ─────────────────────────────────────────────

const drawHLine = (doc, x1, x2, y, color = '#cccccc', width = 0.5) => {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(width).stroke();
};

const drawVLine = (doc, x, y1, y2, color = '#cccccc', width = 0.5) => {
  doc.moveTo(x, y1).lineTo(x, y2).strokeColor(color).lineWidth(width).stroke();
};

const drawRect = (doc, x, y, w, h, fillColor) => {
  doc.rect(x, y, w, h).fill(fillColor);
};

// En-tête République Gabonaise + INPTIC
const drawEnTete = (doc) => {
  const pageW = 595;
  const M = 40;

  // Colonne gauche : INPTIC
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
  doc.text('INSTITUT NATIONAL DE LA POSTE, DES TECHNOLOGIES', M, 30, { width: 200 });
  doc.text("DE L'INFORMATION ET DE LA COMMUNICATION", M, 40, { width: 200 });
  doc.fontSize(7).font('Helvetica').fillColor('#003399');
  doc.text('DIRECTION DES ETUDES ET DE LA PEDAGOGIE', M, 55, { width: 200 });

  // Colonne droite : République Gabonaise
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
  doc.text('RÉPUBLIQUE GABONAISE', pageW - M - 150, 30, { width: 150, align: 'right' });
  doc.fontSize(7).font('Helvetica').fillColor('#000000');
  doc.text('- - - - - - - - - - -', pageW - M - 150, 40, { width: 150, align: 'right' });
  doc.text('Union - Travail - Justice', pageW - M - 150, 50, { width: 150, align: 'right' });
  doc.text('- - - - - - - - - - -', pageW - M - 150, 60, { width: 150, align: 'right' });

  // Ligne séparatrice
  drawHLine(doc, M, pageW - M, 75, '#000000', 1);
};

// ─────────────────────────────────────────────
// BULLETIN SEMESTRE (S5 ou S6)
// ─────────────────────────────────────────────

const genererBulletinSemestre = async (etudiantId, semestreId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestre = await Semestre.findByPk(semestreId);
  const ues = await UE.findAll({ where: { semestreId } });
  const resultat = await ResultatSemestre.findOne({ where: { etudiantId, semestreId } });

  const rang = await getRang(etudiantId, semestreId);
  const nbEtudiants = (await ResultatSemestre.findAll({ where: { semestreId } })).length;
  const moyClasse = await getMoyenneClasseSemestre(semestreId);
  const mention = getMention(resultat?.moyenneSemestre ?? null);

  // Absences
  const absencesMap = {};
  let totalAbsences = 0;
  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    for (const m of matieres) {
      const abs = await Absence.findOne({ where: { etudiantId, matiereId: m.id } });
      if (abs && abs.heures > 0) {
        absencesMap[m.id] = abs.heures;
        totalAbsences += abs.heures;
      }
    }
  }

  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  const buffers = [];
  doc.on('data', c => buffers.push(c));

  const M = 40;
  const pageW = 595;
  const colW = pageW - 2 * M; // 515

  // ── EN-TÊTE ──
  drawEnTete(doc);

  // Titre
  doc.moveDown(0.2);
  doc.y = 90;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
     .text(`Bulletin de notes du ${semestre.libelle}`, { align: 'center' });
  doc.fontSize(10).font('Helvetica')
     .text(`Année universitaire : ${semestre.anneeUniversitaire}`, { align: 'center' });

  // Classe
  doc.moveDown(0.4);
  const clY = doc.y;
  drawRect(doc, M, clY, colW, 22, '#ffffff');
  doc.rect(M, clY, colW, 22).strokeColor('#000000').lineWidth(1.5).stroke();
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
     .text('Classe : Licence Professionnelle Réseaux et Télécommunications  Option ', M + 5, clY + 6, { continued: true })
     .font('Helvetica-Bold').underline(true)
     .text('Administration et Sécurité des Réseaux (ASUR)', { underline: true });
  doc.moveDown(0.2);

  // Infos étudiant
  doc.y = clY + 28;
  const infoY = doc.y;
  const infoH = 30;
  doc.rect(M, infoY, colW * 0.3, infoH).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.rect(M + colW * 0.3, infoY, colW * 0.7, infoH / 2).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.rect(M + colW * 0.3, infoY + infoH / 2, colW * 0.7, infoH / 2).strokeColor('#000000').lineWidth(0.5).stroke();

  doc.fontSize(8).font('Helvetica').fillColor('#000000');
  doc.text("Nom(s) et Prénom(s)", M + 3, infoY + 4, { width: colW * 0.28 });
  doc.text("Date et lieu de naissance", M + 3, infoY + infoH / 2 + 4, { width: colW * 0.28 });

  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(`${etudiant.nom} ${etudiant.prenom}`, M + colW * 0.3 + 5, infoY + 4, { width: colW * 0.65 });
  doc.fontSize(8).font('Helvetica');
  const lieu = etudiant.dateNaissance
    ? `Né[e] le ${etudiant.dateNaissance} à ${etudiant.lieuNaissance || 'N/A'}`
    : 'N/A';
  doc.text(lieu, M + colW * 0.3 + 5, infoY + infoH / 2 + 4, { width: colW * 0.65 });

  // ── TABLEAU NOTES ──
  doc.y = infoY + infoH + 8;

  // Colonnes : Matière | Crédits | Coefficients | Notes étudiant | Moy. classe
  const cols = {
    matiere: { x: M, w: 210 },
    credits: { x: M + 210, w: 50 },
    coef: { x: M + 260, w: 65 },
    note: { x: M + 325, w: 80 },
    moyClasse: { x: M + 405, w: 110 },
  };

  const drawTableHeader = (y) => {
    drawRect(doc, M, y, colW, 16, '#ffffff');
    doc.rect(M, y, colW, 16).strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Crédits', cols.credits.x, y + 3, { width: cols.credits.w, align: 'center' });
    doc.text('Coefficients', cols.coef.x, y + 3, { width: cols.coef.w, align: 'center' });
    doc.text("Notes de l'étudiant", cols.note.x, y + 3, { width: cols.note.w, align: 'center' });
    doc.text('Moyenne de classe', cols.moyClasse.x, y + 3, { width: cols.moyClasse.w, align: 'center' });
    // Séparateurs verticaux
    [cols.credits.x, cols.coef.x, cols.note.x, cols.moyClasse.x, M + colW].forEach(x => {
      drawVLine(doc, x, y, y + 16);
    });
    return y + 16;
  };

  let rowY = drawTableHeader(doc.y);

  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    const moyenneUE = await MoyenneUE.findOne({ where: { etudiantId, ueId: ue.id } });
    const moyClasseUE = await getMoyenneClasseUE(ue.id);

    // En-tête UE
    drawRect(doc, M, rowY, colW, 14, '#dce6f1');
    doc.rect(M, rowY, colW, 14).strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#003399');
    doc.text(`${ue.code} : ${ue.libelle}`, M + 4, rowY + 3, { width: 280 });
    [cols.credits.x, cols.coef.x, cols.note.x, cols.moyClasse.x, M + colW].forEach(x => {
      drawVLine(doc, x, rowY, rowY + 14);
    });
    rowY += 14;

    // Lignes matières
    for (let i = 0; i < matieres.length; i++) {
      const mat = matieres[i];
      const moyMat = await MoyenneMatiere.findOne({ where: { etudiantId, matiereId: mat.id } });
      const moyClasseMat = await getMoyenneClasseMatiere(mat.id);
      const noteMat = moyMat?.moyenne ?? null;

      const bg = i % 2 === 0 ? '#ffffff' : '#f5f5f5';
      drawRect(doc, M, rowY, colW, 14, bg);
      doc.rect(M, rowY, colW, 14).strokeColor('#cccccc').lineWidth(0.3).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#000000');
      doc.text(`    ${mat.libelle}`, M + 2, rowY + 3, { width: cols.credits.x - M - 4 });
      doc.text(mat.credits.toString(), cols.credits.x, rowY + 3, { width: cols.credits.w, align: 'center' });
      doc.text(fmt(mat.coefficient), cols.coef.x, rowY + 3, { width: cols.coef.w, align: 'center' });

      // Note étudiant en bleu/rouge
      const noteColor = noteMat !== null ? (noteMat >= 10 ? '#003399' : '#cc0000') : '#000000';
      doc.fillColor(noteColor).font('Helvetica-Bold')
         .text(fmt(noteMat), cols.note.x, rowY + 3, { width: cols.note.w, align: 'center' });
      doc.fillColor('#000000').font('Helvetica')
         .text(fmt(moyClasseMat), cols.moyClasse.x, rowY + 3, { width: cols.moyClasse.w, align: 'center' });

      [cols.credits.x, cols.coef.x, cols.note.x, cols.moyClasse.x, M + colW].forEach(x => {
        drawVLine(doc, x, rowY, rowY + 14);
      });
      rowY += 14;
    }

    // Ligne Moyenne UE
    drawRect(doc, M, rowY, colW, 14, '#eaf0fb');
    doc.rect(M, rowY, colW, 14).strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    const creditsUE = matieres.reduce((s, m) => s + m.credits, 0);
    doc.text(`        Moyenne ${ue.code}`, M + 2, rowY + 3, { width: cols.credits.x - M - 2 });
    doc.text(creditsUE.toString(), cols.credits.x, rowY + 3, { width: cols.credits.w, align: 'center' });
    const coefUE = matieres.reduce((s, m) => s + (parseFloat(m.coefficient) || 0), 0);
    doc.text(coefUE.toFixed(2), cols.coef.x, rowY + 3, { width: cols.coef.w, align: 'center' });
    const moyUE = moyenneUE?.moyenne ?? null;
    const couleurUE = moyUE !== null ? (moyUE >= 10 ? '#003399' : '#cc0000') : '#000000';
    doc.fillColor(couleurUE).text(fmt(moyUE), cols.note.x, rowY + 3, { width: cols.note.w, align: 'center' });
    doc.fillColor('#000000').text(fmt(moyClasseUE), cols.moyClasse.x, rowY + 3, { width: cols.moyClasse.w, align: 'center' });
    [cols.credits.x, cols.coef.x, cols.note.x, cols.moyClasse.x, M + colW].forEach(x => {
      drawVLine(doc, x, rowY, rowY + 14);
    });
    rowY += 14;

    // Espacement inter-UE
    rowY += 4;
  }

  // ── PÉNALITÉS D'ABSENCES ──
  rowY += 4;
  drawRect(doc, M, rowY, colW, 14, '#ffffff');
  doc.rect(M, rowY, colW, 14).strokeColor('#cccccc').lineWidth(0.3).stroke();
  doc.fontSize(8).font('Helvetica').fillColor('#cc0000');
  doc.text('Pénalités d\'absences', M + 4, rowY + 3, { width: 200 });
  doc.fillColor('#cc0000').font('Helvetica-Bold')
     .text('0,01/heure', cols.coef.x, rowY + 3, { width: cols.coef.w, align: 'center' });
  doc.fillColor('#000000').font('Helvetica')
     .text(`${totalAbsences} heure(s)`, cols.note.x, rowY + 3, { width: cols.note.w + cols.moyClasse.w, align: 'center' });
  [cols.credits.x, cols.coef.x, cols.note.x, cols.moyClasse.x, M + colW].forEach(x => {
    drawVLine(doc, x, rowY, rowY + 14);
  });
  rowY += 18;

  // ── MOYENNE SEMESTRE ──
  drawRect(doc, M, rowY, colW, 16, '#f0f0f0');
  doc.rect(M, rowY, colW, 16).strokeColor('#000000').lineWidth(1).stroke();
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
  doc.text(`Moyenne ${semestre.libelle}`, M + 4, rowY + 3, { width: 250 });
  const moySem = resultat?.moyenneSemestre ?? null;
  const couleurSem = moySem !== null ? (moySem >= 10 ? '#003399' : '#cc0000') : '#000000';
  doc.fillColor(couleurSem)
     .text(fmt(moySem), cols.note.x, rowY + 3, { width: cols.note.w, align: 'center' });
  doc.fillColor('#000000')
     .text(fmt(moyClasse), cols.moyClasse.x, rowY + 3, { width: cols.moyClasse.w, align: 'center' });
  [cols.credits.x, cols.coef.x, cols.note.x, cols.moyClasse.x, M + colW].forEach(x => {
    drawVLine(doc, x, rowY, rowY + 16);
  });
  rowY += 20;

  // Rang + Mention
  doc.rect(M, rowY, colW / 2, 28).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.rect(M + colW / 2, rowY, colW / 2, 28).strokeColor('#000000').lineWidth(0.5).stroke();
  drawHLine(doc, M, M + colW, rowY + 14, '#000000', 0.5);

  doc.fontSize(8).font('Helvetica').fillColor('#000000');
  doc.text("Rang de l'étudiant au Semestre", M + 4, rowY + 3, { width: colW / 2 - 8, align: 'center' });
  doc.text("Mention", M + colW / 2 + 4, rowY + 3, { width: colW / 2 - 8, align: 'center' });
  doc.fontSize(9).font('Helvetica-Bold');
  const rangText = rang ? `${rang}/${nbEtudiants}` : 'Non classé';
  doc.text(rangText, M + 4, rowY + 16, { width: colW / 2 - 8, align: 'center' });
  doc.text(mention, M + colW / 2 + 4, rowY + 16, { width: colW / 2 - 8, align: 'center' });
  rowY += 32;

  // ── VALIDATION DES CRÉDITS ──
  rowY += 6;
  doc.rect(M, rowY, colW, 14).fill('#e8f0fe').stroke();
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
     .text(`Etat de la Validation des Crédits au ${semestre.libelle}`, M, rowY + 3, { align: 'center' });
  rowY += 14;

  // Tableau 3 colonnes : UE1 | UE2 | Crédits total
  const nbUE = ues.length;
  const cw3 = colW / (nbUE + 1);
  const cellH = 32;

  // En-têtes colonnes
  for (let i = 0; i < nbUE; i++) {
    doc.rect(M + i * cw3, rowY, cw3, cellH).strokeColor('#000000').lineWidth(0.5).stroke();
  }
  doc.rect(M + nbUE * cw3, rowY, cw3, cellH).strokeColor('#000000').lineWidth(0.5).stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
  for (let i = 0; i < nbUE; i++) {
    const ue = ues[i];
    const moyUE = await MoyenneUE.findOne({ where: { etudiantId, ueId: ue.id } });
    const credAcquis = moyUE?.creditsAcquis ?? 0;
    const creditsTot = (await Matiere.findAll({ where: { ueId: ue.id } })).reduce((s, m) => s + m.credits, 0);
    const compense = moyUE?.compense ?? false;
    const statut = compense ? 'UE Acquise par Compensation' : credAcquis >= creditsTot ? 'UE Acquise' : 'UE non Acquise';

    doc.text(`${ue.code}`, M + i * cw3 + 4, rowY + 3, { width: cw3 - 8, align: 'center' });
    doc.fontSize(7).font('Helvetica')
       .text(`${credAcquis} Crédits / ${creditsTot}`, M + i * cw3 + 4, rowY + 14, { width: cw3 - 8, align: 'center' });
    doc.text(statut, M + i * cw3 + 4, rowY + 23, { width: cw3 - 8, align: 'center' });
    doc.fontSize(8).font('Helvetica-Bold');
  }

  // Colonne crédits total
  const credTotal = resultat?.creditsTotal ?? 0;
  const totalCredits = 30;
  const semValide = resultat?.valide ?? false;
  doc.fontSize(8).font('Helvetica-Bold')
     .text('Crédits validés au Semestre', M + nbUE * cw3 + 4, rowY + 3, { width: cw3 - 8, align: 'center' });
  doc.fontSize(9)
     .text(`${credTotal} Crédits /${totalCredits}`, M + nbUE * cw3 + 4, rowY + 16, { width: cw3 - 8, align: 'center' });
  doc.fontSize(7).font('Helvetica')
     .text(semValide ? 'Semestre Acquis par Compensation' : 'Semestre non Acquis', M + nbUE * cw3 + 4, rowY + 26, { width: cw3 - 8, align: 'center' });

  rowY += cellH + 10;

  // ── DÉCISION DU JURY ──
  drawHLine(doc, M, M + colW, rowY, '#003399', 1);
  rowY += 4;
  doc.fontSize(9).font('Helvetica').fillColor('#003399')
     .text('Décision du Jury : ', M, rowY + 2, { continued: true })
     .font('Helvetica-Bold')
     .text(semValide ? `${semestre.libelle} validé` : `${semestre.libelle} non validé`);
  rowY += 16;
  drawHLine(doc, M, M + colW, rowY, '#003399', 1);
  rowY += 12;

  // ── SIGNATURE ──
  doc.fontSize(8).font('Helvetica').fillColor('#000000')
     .text(`Fait à Libreville, le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.text('Le Directeur des Etudes et de la Pédagogie', { align: 'center' });
  doc.moveDown(2);
  doc.text('Davy Edgard MOUSSAVOU', { align: 'center' });

  // ── PIED DE PAGE ──
  doc.moveDown(1);
  drawHLine(doc, M, M + colW, doc.y, '#000000', 0.5);
  doc.moveDown(0.3);
  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#555555')
     .text("Il ne sera délivré qu'un seul et unique exemplaire de bulletins de notes. L'étudiant est donc prié d'en faire plusieurs copies légalisées.", M, doc.y, { align: 'center' });

  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
};

// ─────────────────────────────────────────────
// BULLETIN ANNUEL
// ─────────────────────────────────────────────

const genererBulletinAnnuel = async (etudiantId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestres = await Semestre.findAll();
  const s5 = semestres.find(s => s.libelle === 'S5');
  const s6 = semestres.find(s => s.libelle === 'S6');

  const resultatS5 = s5 ? await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s5.id } }) : null;
  const resultatS6 = s6 ? await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s6.id } }) : null;
  const resultatAnnuel = await ResultatAnnuel.findOne({ where: { etudiantId } });

  const rangAnnuel = await getRangAnnuel(etudiantId);
  const nbEtudiants = (await ResultatAnnuel.findAll()).length;

  // Moyennes classe par semestre
  const moyClasseS5 = s5 ? await getMoyenneClasseSemestre(s5.id) : null;
  const moyClasseS6 = s6 ? await getMoyenneClasseSemestre(s6.id) : null;
  const moyClasseAnnuelle = (moyClasseS5 !== null && moyClasseS6 !== null)
    ? (moyClasseS5 + moyClasseS6) / 2 : null;

  const mention = getMention(resultatAnnuel?.moyenneAnnuelle ?? null);

  const decision = resultatAnnuel?.decisionJury === 'DIPLOME' ? 'Diplômé(e)'
    : resultatAnnuel?.decisionJury === 'REPRISE_SOUTENANCE' ? 'Reprise de Soutenance'
    : 'Redouble la Licence 3';

  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  const buffers = [];
  doc.on('data', c => buffers.push(c));

  const M = 40;
  const pageW = 595;
  const colW = pageW - 2 * M;

  // ── EN-TÊTE ──
  drawEnTete(doc);
  doc.y = 90;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
     .text('Bulletin de notes Annuel', { align: 'center' });
  doc.fontSize(10).font('Helvetica')
     .text(`Année universitaire : ${s5?.anneeUniversitaire || '2025-2026'}`, { align: 'center' });
  doc.moveDown(0.3);

  // Classe
  const clY = doc.y;
  doc.rect(M, clY, colW, 22).fill('#ffffff').stroke();
  doc.rect(M, clY, colW, 22).strokeColor('#000000').lineWidth(1.5).stroke();
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
     .text('Classe : Licence Professionnelle Réseaux et Télécommunications  Option ', M + 5, clY + 6, { continued: true })
     .text('Administration et Sécurité des Réseaux (ASUR)', { underline: true });

  // Infos étudiant
  const infoY = clY + 26;
  const infoH = 30;
  doc.rect(M, infoY, colW * 0.3, infoH).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.rect(M + colW * 0.3, infoY, colW * 0.7, infoH / 2).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.rect(M + colW * 0.3, infoY + infoH / 2, colW * 0.7, infoH / 2).strokeColor('#000000').lineWidth(0.5).stroke();

  doc.fontSize(8).font('Helvetica').fillColor('#000000');
  doc.text("Nom(s) et Prénom(s)", M + 3, infoY + 4, { width: colW * 0.28 });
  doc.text("Date et lieu de naissance", M + 3, infoY + infoH / 2 + 4, { width: colW * 0.28 });
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(`${etudiant.nom} ${etudiant.prenom}`, M + colW * 0.3 + 5, infoY + 4, { width: colW * 0.65 });
  doc.fontSize(8).font('Helvetica');
  const lieu = etudiant.dateNaissance
    ? `Né[e] le ${etudiant.dateNaissance} à ${etudiant.lieuNaissance || 'N/A'}`
    : 'N/A';
  doc.text(lieu, M + colW * 0.3 + 5, infoY + infoH / 2 + 4, { width: colW * 0.65 });

  // ── RANG DE L'ÉTUDIANT À L'ANNÉE ──
  doc.y = infoY + infoH + 8;
  const rangY = doc.y;
  doc.rect(M, rangY, colW, 14).fill('#f0f0f0').stroke();
  doc.rect(M, rangY, colW, 14).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
     .text("Rang de l'étudiant à l'année", M + 4, rangY + 3, { width: 200 });
  const rangAnnuelText = rangAnnuel ? `${rangAnnuel}/${nbEtudiants}` : '#REF!';
  doc.text(rangAnnuelText, M + 200, rangY + 3, { width: colW - 204 });
  doc.y = rangY + 18;

  // ── TABLEAU ANNUEL PAR UE ──
  // Colonnes : UE/Matière | Coeff | Notes | Rang | Moy. classe
  const colsA = {
    label: { x: M, w: 170 },
    coef: { x: M + 170, w: 60 },
    note: { x: M + 230, w: 80 },
    rang: { x: M + 310, w: 80 },
    moyC: { x: M + 390, w: 125 },
  };

  const drawHeaderAnnuel = (y) => {
    drawRect(doc, M, y, colW, 16, '#ffffff');
    doc.rect(M, y, colW, 16).strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Coefficients', colsA.coef.x, y + 3, { width: colsA.coef.w, align: 'center' });
    doc.text('Notes', colsA.note.x, y + 3, { width: colsA.note.w, align: 'center' });
    doc.text('Rang', colsA.rang.x, y + 3, { width: colsA.rang.w, align: 'center' });
    doc.text('Moyenne de classe', colsA.moyC.x, y + 3, { width: colsA.moyC.w, align: 'center' });
    Object.values(colsA).slice(1).forEach(c => drawVLine(doc, c.x, y, y + 16));
    drawVLine(doc, M + colW, y, y + 16);
    return y + 16;
  };

  let rowY = drawHeaderAnnuel(doc.y);

  // Données par UE et par semestre
  const semestresData = [
    { sem: s5, res: resultatS5, label: 'Semestre 1', moyC: moyClasseS5 },
    { sem: s6, res: resultatS6, label: 'Semestre 2', moyC: moyClasseS6 },
  ];

  // Récupérer toutes les UE regroupées par semestre
  const allUEs = [];
  for (const { sem, res, label, moyC } of semestresData) {
    if (!sem) continue;
    const ues = await UE.findAll({ where: { semestreId: sem.id } });
    allUEs.push({ label, ues, res, moyC, semestreId: sem.id });
  }

  // Afficher UE par ligne (structure du bulletin cible)
  // Ligne UE avec S1 / S2 / Annuel
  const ueGroups = [];
  if (s5 && s6) {
    const uesS5 = await UE.findAll({ where: { semestreId: s5.id } });
    const uesS6 = await UE.findAll({ where: { semestreId: s6.id } });

    // Grouper par position
    const maxUE = Math.max(uesS5.length, uesS6.length);
    for (let i = 0; i < maxUE; i++) {
      ueGroups.push({ ueS5: uesS5[i] || null, ueS6: uesS6[i] || null });
    }
  }

  // Pour chaque UE group, afficher la section
  for (const group of ueGroups) {
    // En-tête groupe UE
    const ueLabel = group.ueS5 ? group.ueS5.libelle : (group.ueS6 ? group.ueS6.libelle : '');
    drawRect(doc, M, rowY, colW, 14, '#dce6f1');
    doc.rect(M, rowY, colW, 14).strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#003399')
       .text(ueLabel, M + 4, rowY + 3, { width: 250 });
    Object.values(colsA).slice(1).forEach(c => drawVLine(doc, c.x, rowY, rowY + 14));
    drawVLine(doc, M + colW, rowY, rowY + 14);
    rowY += 14;

    const rows = [
      { sem: 'Semestre 1', ue: group.ueS5, semestreId: s5?.id, res: resultatS5, moyC: moyClasseS5 },
      { sem: 'Semestre 2', ue: group.ueS6, semestreId: s6?.id, res: resultatS6, moyC: moyClasseS6 },
    ];

    for (const row of rows) {
      const matieres = row.ue ? await Matiere.findAll({ where: { ueId: row.ue.id } }) : [];
      const moyUE = row.ue ? await MoyenneUE.findOne({ where: { etudiantId, ueId: row.ue.id } }) : null;
      const moyClasseUEVal = row.ue ? await getMoyenneClasseUE(row.ue.id) : null;
      const coefUE = matieres.reduce((s, m) => s + (parseFloat(m.coefficient) || 0), 0);

      const rangSem = row.semestreId ? await getRang(etudiantId, row.semestreId) : null;
      const nbEtSem = row.semestreId ? (await ResultatSemestre.findAll({ where: { semestreId: row.semestreId } })).length : 0;

      drawRect(doc, M, rowY, colW, 14, '#ffffff');
      doc.rect(M, rowY, colW, 14).strokeColor('#cccccc').lineWidth(0.3).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#000000');
      doc.text(`    ${row.sem}`, M + 2, rowY + 3, { width: colsA.coef.x - M - 4 });
      doc.text(coefUE.toFixed(2), colsA.coef.x, rowY + 3, { width: colsA.coef.w, align: 'center' });

      const moyVal = moyUE?.moyenne ?? null;
      const couleur = moyVal !== null ? (moyVal >= 10 ? '#003399' : '#cc0000') : '#000000';
      doc.fillColor(couleur).font('Helvetica-Bold')
         .text(fmt(moyVal), colsA.note.x, rowY + 3, { width: colsA.note.w, align: 'center' });

      doc.fillColor('#000000').font('Helvetica');
      const rangTexte = rangSem ? `${rangSem}/${nbEtSem}` : '#REF!';
      doc.text(rangTexte, colsA.rang.x, rowY + 3, { width: colsA.rang.w, align: 'center' });
      doc.text(fmt(moyClasseUEVal), colsA.moyC.x, rowY + 3, { width: colsA.moyC.w, align: 'center' });

      Object.values(colsA).slice(1).forEach(c => drawVLine(doc, c.x, rowY, rowY + 14));
      drawVLine(doc, M + colW, rowY, rowY + 14);
      rowY += 14;
    }

    // Ligne Annuel UE
    const moyUES5 = group.ueS5 ? await MoyenneUE.findOne({ where: { etudiantId, ueId: group.ueS5.id } }) : null;
    const moyUES6 = group.ueS6 ? await MoyenneUE.findOne({ where: { etudiantId, ueId: group.ueS6.id } }) : null;
    const matS5 = group.ueS5 ? await Matiere.findAll({ where: { ueId: group.ueS5.id } }) : [];
    const matS6 = group.ueS6 ? await Matiere.findAll({ where: { ueId: group.ueS6.id } }) : [];
    const coefAnnuel = matS5.reduce((s, m) => s + (parseFloat(m.coefficient) || 0), 0) + matS6.reduce((s, m) => s + (parseFloat(m.coefficient) || 0), 0);
    const creditsAnnuel = matS5.reduce((s, m) => s + m.credits, 0) + matS6.reduce((s, m) => s + m.credits, 0);

    const moyAnnUE = (moyUES5?.moyenne != null && moyUES6?.moyenne != null)
      ? (moyUES5.moyenne + moyUES6.moyenne) / 2
      : (moyUES5?.moyenne ?? moyUES6?.moyenne ?? null);

    drawRect(doc, M, rowY, colW, 14, '#eaf0fb');
    doc.rect(M, rowY, colW, 14).strokeColor('#000000').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    doc.text(`        Annuel`, M + 2, rowY + 3, { width: colsA.coef.x - M - 2 });
    doc.text(coefAnnuel.toFixed(2), colsA.coef.x, rowY + 3, { width: colsA.coef.w, align: 'center' });
    doc.text(creditsAnnuel.toString(), colsA.note.x, rowY + 3, { width: colsA.note.w, align: 'center' });

    const mc1 = (await getMoyenneClasseUE(group.ueS5?.id)) || 0;
    const mc2 = (await getMoyenneClasseUE(group.ueS6?.id)) || 0;
    const moyClasseAnnUE = (mc1 && mc2) ? (mc1 + mc2) / 2 : (mc1 || mc2 || null);
    doc.text(fmt(moyClasseAnnUE), colsA.moyC.x, rowY + 3, { width: colsA.moyC.w, align: 'center' });

    Object.values(colsA).slice(1).forEach(c => drawVLine(doc, c.x, rowY, rowY + 14));
    drawVLine(doc, M + colW, rowY, rowY + 14);
    rowY += 18;
  }

  // ── BILAN ANNUEL ──
  drawRect(doc, M, rowY, colW, 14, '#dce6f1');
  doc.rect(M, rowY, colW, 14).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#003399')
     .text('Bilan annuel', M + 4, rowY + 3);
  Object.values(colsA).slice(1).forEach(c => drawVLine(doc, c.x, rowY, rowY + 14));
  drawVLine(doc, M + colW, rowY, rowY + 14);
  rowY += 14;

  const bilanRows = [
    { label: 'Semestre 1', coef: 18, note: resultatS5?.moyenneSemestre ?? null, moyC: moyClasseS5, semestreId: s5?.id },
    { label: 'Semestre 2', coef: 24, note: resultatS6?.moyenneSemestre ?? null, moyC: moyClasseS6, semestreId: s6?.id },
    { label: 'Annuel', coef: 42, note: resultatAnnuel?.moyenneAnnuelle ?? null, moyC: moyClasseAnnuelle, rang: rangAnnuel, nbEt: nbEtudiants },
  ];

  for (let i = 0; i < bilanRows.length; i++) {
    const row = bilanRows[i];
    const rangSem = row.semestreId ? await getRang(etudiantId, row.semestreId) : row.rang;
    const nbEtSem = row.semestreId ? (await ResultatSemestre.findAll({ where: { semestreId: row.semestreId } })).length : (row.nbEt ?? nbEtudiants);

    const bg = i % 2 === 0 ? '#f5f5f5' : '#ffffff';
    drawRect(doc, M, rowY, colW, 14, bg);
    doc.rect(M, rowY, colW, 14).strokeColor('#cccccc').lineWidth(0.3).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#000000');
    doc.text(`    ${row.label}`, M + 2, rowY + 3, { width: colsA.coef.x - M - 4 });
    doc.text(row.coef.toString(), colsA.coef.x, rowY + 3, { width: colsA.coef.w, align: 'center' });

    const couleur = row.note !== null ? (row.note >= 10 ? '#003399' : '#cc0000') : '#000000';
    doc.fillColor(couleur).font('Helvetica-Bold')
       .text(fmt(row.note), colsA.note.x, rowY + 3, { width: colsA.note.w, align: 'center' });

    doc.fillColor('#000000').font('Helvetica');
    const rangText = rangSem ? `${rangSem}/${nbEtSem}` : '#REF!';
    doc.text(rangText, colsA.rang.x, rowY + 3, { width: colsA.rang.w, align: 'center' });
    doc.text(fmt(row.moyC), colsA.moyC.x, rowY + 3, { width: colsA.moyC.w, align: 'center' });

    Object.values(colsA).slice(1).forEach(c => drawVLine(doc, c.x, rowY, rowY + 14));
    drawVLine(doc, M + colW, rowY, rowY + 14);
    rowY += 14;
  }

  rowY += 10;

  // ── DÉCISION + MENTION ──
  doc.fontSize(9).font('Helvetica').fillColor('#000000')
     .text('Décision du Conseil d\'Etablissement :', M, rowY);
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica')
     .text('Mention : ', M, doc.y, { continued: true })
     .font('Helvetica-Bold')
     .text(mention);
  doc.moveDown(0.5);

  // ── SIGNATURES ──
  doc.fontSize(8).font('Helvetica').fillColor('#000000');
  const sigY = doc.y + 10;
  doc.text('Le Responsable pédagogique', M + 40, sigY, { width: 180, align: 'center' });
  doc.text('Le Chef de département', M + 295, sigY, { width: 180, align: 'center' });
  doc.moveDown(2.5);
  doc.text('Signature : _______________', M + 40, doc.y, { width: 180, align: 'center' });
  doc.text('Signature : _______________', M + 295, doc.y, { width: 180, align: 'center' });

  // ── PIED DE PAGE ──
  doc.moveDown(1.5);
  drawHLine(doc, M, M + colW, doc.y, '#000000', 0.5);
  doc.moveDown(0.3);
  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#555555')
     .text("Il ne sera délivré qu'un seul et unique exemplaire de bulletins de notes !", M, doc.y, { align: 'center' });

  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
};

// ─────────────────────────────────────────────
// VERSIONS HTML (conservées pour compatibilité)
// ─────────────────────────────────────────────

const genererBulletinHTML = async (etudiantId, semestreId) => {
  const etudiant = await Etudiant.findByPk(etudiantId);
  const semestre = await Semestre.findByPk(semestreId);
  const ues = await UE.findAll({ where: { semestreId } });
  const resultat = await ResultatSemestre.findOne({ where: { etudiantId, semestreId } });
  const rang = await getRang(etudiantId, semestreId);
  const nbEtudiants = (await ResultatSemestre.findAll({ where: { semestreId } })).length;
  const moyClasse = await getMoyenneClasseSemestre(semestreId);
  const mention = getMention(resultat?.moyenneSemestre ?? null);

  let lignesUE = '';
  for (const ue of ues) {
    const matieres = await Matiere.findAll({ where: { ueId: ue.id } });
    const moyenneUE = await MoyenneUE.findOne({ where: { etudiantId, ueId: ue.id } });
    const moyClasseUE = await getMoyenneClasseUE(ue.id);
    const creditsUE = matieres.reduce((s, m) => s + m.credits, 0);
    const coefUE = matieres.reduce((s, m) => s + (parseFloat(m.coefficient) || 0), 0);

    let lignesMatieres = '';
    for (const matiere of matieres) {
      const moyMat = await MoyenneMatiere.findOne({ where: { etudiantId, matiereId: matiere.id } });
      const moyClasseMat = await getMoyenneClasseMatiere(matiere.id);
      const moy = moyMat?.moyenne ?? null;
      const couleur = moy !== null ? (moy >= 10 ? '#003399' : '#cc0000') : '#333';
      lignesMatieres += `<tr>
        <td style="text-align:left;padding-left:16px">${matiere.libelle}</td>
        <td>${matiere.credits}</td>
        <td>${fmt(matiere.coefficient)}</td>
        <td style="color:${couleur};font-weight:bold">${fmt(moy)}</td>
        <td>${fmt(moyClasseMat)}</td>
      </tr>`;
    }

    const moyUE = moyenneUE?.moyenne ?? null;
    const couleurUE = moyUE !== null ? (moyUE >= 10 ? '#003399' : '#cc0000') : '#333';
    lignesUE += `
      <tr class="ue-header"><td colspan="5">${ue.code} : ${ue.libelle}</td></tr>
      ${lignesMatieres}
      <tr class="ue-footer">
        <td style="text-align:right">Moyenne ${ue.code}</td>
        <td>${creditsUE}</td>
        <td>${fmt(coefUE)}</td>
        <td style="color:${couleurUE};font-weight:bold">${fmt(moyUE)}</td>
        <td>${fmt(moyClasseUE)}</td>
      </tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin ${semestre.libelle} — ${etudiant.nom} ${etudiant.prenom}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .header-left { font-size: 10px; }
    .header-right { font-size: 10px; text-align: right; }
    h2 { text-align: center; color: #000; font-size: 16px; margin: 10px 0 4px; }
    h3 { text-align: center; font-size: 12px; color: #333; margin: 2px 0 10px; }
    .classe-box { border: 2px solid #000; padding: 6px 10px; font-weight: bold; font-size: 11px; margin-bottom: 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .info-table td { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
    table.notes { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
    table.notes th { background: #fff; border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold; }
    table.notes td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
    tr:nth-child(even) td { background: #f5f5f5; }
    .ue-header td { background: #dce6f1 !important; color: #003399; font-weight: bold; text-align: left; padding-left: 6px; border: 1px solid #000; }
    .ue-footer td { background: #eaf0fb !important; font-weight: bold; border: 1px solid #000; }
    .absence-row td { color: #cc0000; }
    .moyenne-row td { background: #f0f0f0 !important; font-weight: bold; font-size: 12px; border: 1px solid #000; }
    .rang-box { display: flex; margin: 6px 0; }
    .rang-box div { flex: 1; border: 1px solid #000; padding: 5px; text-align: center; font-size: 11px; }
    .validation-box { border: 1px solid #000; margin: 8px 0; }
    .validation-header { background: #e8f0fe; font-weight: bold; padding: 4px 8px; text-align: center; font-size: 11px; }
    .validation-table { width: 100%; border-collapse: collapse; }
    .validation-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; }
    .decision { color: #003399; font-size: 12px; margin: 6px 0; border-top: 2px solid #003399; border-bottom: 2px solid #003399; padding: 4px 0; }
    .footer-text { font-size: 9px; font-style: italic; text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 6px; }
    .signature-block { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
    .signature { text-align: center; width: 200px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <strong>INSTITUT NATIONAL DE LA POSTE, DES TECHNOLOGIES<br>DE L'INFORMATION ET DE LA COMMUNICATION</strong><br>
      <span style="color:#003399">DIRECTION DES ETUDES ET DE LA PEDAGOGIE</span>
    </div>
    <div class="header-right">
      <strong>RÉPUBLIQUE GABONAISE</strong><br>
      - - - - - - - - - - -<br>
      Union - Travail - Justice<br>
      - - - - - - - - - - -
    </div>
  </div>

  <h2>Bulletin de notes du ${semestre.libelle}</h2>
  <h3>Année universitaire : ${semestre.anneeUniversitaire}</h3>

  <div class="classe-box">
    Classe : Licence Professionnelle Réseaux et Télécommunications &nbsp;
    Option <u>Administration et Sécurité des Réseaux (ASUR)</u>
  </div>

  <table class="info-table">
    <tr>
      <td style="width:25%">Nom(s) et Prénom(s)</td>
      <td><strong>${etudiant.nom} ${etudiant.prenom}</strong></td>
    </tr>
    <tr>
      <td>Date et lieu de naissance</td>
      <td>${etudiant.dateNaissance ? `Né[e] le ${etudiant.dateNaissance} à ${etudiant.lieuNaissance || 'N/A'}` : 'N/A'}</td>
    </tr>
  </table>

  <table class="notes">
    <thead>
      <tr>
        <th style="text-align:left;width:40%"></th>
        <th>Crédits</th>
        <th>Coefficients</th>
        <th>Notes de l'étudiant</th>
        <th>Moyenne de classe</th>
      </tr>
    </thead>
    <tbody>
      ${lignesUE}
      <tr class="absence-row">
        <td style="text-align:left">Pénalités d'absences</td>
        <td></td>
        <td style="color:#cc0000;font-weight:bold">0,01/heure</td>
        <td colspan="2">0 heure(s)</td>
      </tr>
      <tr class="moyenne-row">
        <td colspan="3" style="text-align:right">Moyenne ${semestre.libelle}</td>
        <td style="color:${(resultat?.moyenneSemestre ?? 0) >= 10 ? '#003399' : '#cc0000'}">${fmt(resultat?.moyenneSemestre)}</td>
        <td>${fmt(moyClasse)}</td>
      </tr>
    </tbody>
  </table>

  <div class="rang-box">
    <div>
      <div style="border-bottom:1px solid #000;margin-bottom:4px">Rang de l'étudiant au Semestre</div>
      <strong>${rang ? `${rang}/${nbEtudiants}` : 'Non classé'}</strong>
    </div>
    <div>
      <div style="border-bottom:1px solid #000;margin-bottom:4px">Mention</div>
      <strong>${mention}</strong>
    </div>
  </div>

  <div class="validation-box">
    <div class="validation-header">Etat de la Validation des Crédits au ${semestre.libelle}</div>
    <table class="validation-table">
      <tr>
        ${ues.map(ue => `<td><strong>${ue.code}</strong></td>`).join('')}
        <td><strong>Crédits validés au Semestre</strong></td>
      </tr>
      <tr>
        ${(await Promise.all(ues.map(async ue => {
          const m = await MoyenneUE.findOne({ where: { etudiantId, ueId: ue.id } });
          const mats = await Matiere.findAll({ where: { ueId: ue.id } });
          const tot = mats.reduce((s, x) => s + x.credits, 0);
          return `<td>${m?.creditsAcquis ?? 0} Crédits / ${tot}<br><small>${m?.compense ? 'UE Acquise par Compensation' : (m?.creditsAcquis > 0 ? 'UE Acquise' : 'UE non Acquise')}</small></td>`;
        }))).join('')}
        <td>${resultat?.creditsTotal ?? 0} Crédits /30<br><small>${resultat?.valide ? 'Semestre Acquis par Compensation' : 'Semestre non Acquis'}</small></td>
      </tr>
    </table>
  </div>

  <div class="decision">
    Décision du Jury : <strong>${resultat?.valide ? `${semestre.libelle} validé` : `${semestre.libelle} non validé`}</strong>
  </div>

  <div style="text-align:center;margin-top:20px;font-size:11px">
    Fait à Libreville, le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}<br><br>
    Le Directeur des Etudes et de la Pédagogie<br><br><br>
    Davy Edgard MOUSSAVOU
  </div>

  <div class="footer-text">
    Il ne sera délivré qu'un seul et unique exemplaire de bulletins de notes. L'étudiant est donc prié d'en faire plusieurs copies légalisées.
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

  const resultatS5 = s5 ? await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s5.id } }) : null;
  const resultatS6 = s6 ? await ResultatSemestre.findOne({ where: { etudiantId, semestreId: s6.id } }) : null;
  const resultatAnnuel = await ResultatAnnuel.findOne({ where: { etudiantId } });
  const rangAnnuel = await getRangAnnuel(etudiantId);
  const nbEtudiants = (await ResultatAnnuel.findAll()).length;
  const mention = getMention(resultatAnnuel?.moyenneAnnuelle ?? null);

  const decision = resultatAnnuel?.decisionJury === 'DIPLOME' ? 'Diplômé(e)'
    : resultatAnnuel?.decisionJury === 'REPRISE_SOUTENANCE' ? 'Reprise de Soutenance'
    : 'Redouble la Licence 3';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin Annuel — ${etudiant.nom} ${etudiant.prenom}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .header-left, .header-right { font-size: 10px; }
    .header-right { text-align: right; }
    h2 { text-align: center; font-size: 16px; margin: 8px 0 4px; }
    h3 { text-align: center; font-size: 12px; margin: 2px 0 8px; }
    .classe-box { border: 2px solid #000; padding: 6px 10px; font-weight: bold; font-size: 11px; margin-bottom: 8px; }
    .info-table, .notes-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .info-table td { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
    .notes-table th { background: #fff; border: 1px solid #000; padding: 5px; text-align: center; font-size: 11px; }
    .notes-table td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; font-size: 11px; }
    .ue-header td { background: #dce6f1 !important; color: #003399; font-weight: bold; text-align: left; padding-left: 6px; border: 1px solid #000; }
    .sem-row td { background: #ffffff; }
    .annuel-row td { background: #eaf0fb !important; font-weight: bold; border: 1px solid #000; }
    .bilan-header td { background: #dce6f1 !important; color: #003399; font-weight: bold; border: 1px solid #000; }
    .rang-annuel { background: #f0f0f0; border: 1px solid #000; padding: 5px 10px; margin-bottom: 8px; font-size: 11px; }
    .decision-box { text-align: center; border: 2px solid #003399; padding: 10px; margin: 15px 0; color: #003399; font-size: 14px; font-weight: bold; }
    .signature-block { display: flex; justify-content: space-between; margin-top: 40px; }
    .signature { text-align: center; font-size: 11px; }
    .footer-text { font-size: 9px; font-style: italic; text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <strong>INSTITUT NATIONAL DE LA POSTE, DES TECHNOLOGIES<br>DE L'INFORMATION ET DE LA COMMUNICATION</strong><br>
      <span style="color:#003399">DIRECTION DES ETUDES ET DE LA PEDAGOGIE</span>
    </div>
    <div class="header-right">
      <strong>RÉPUBLIQUE GABONAISE</strong><br>
      - - - - - - - - - - -<br>
      Union - Travail - Justice<br>
      - - - - - - - - - - -
    </div>
  </div>

  <h2>Bulletin de notes Annuel</h2>
  <h3>Année universitaire : ${s5?.anneeUniversitaire || '2025-2026'}</h3>

  <div class="classe-box">
    Classe : Licence Professionnelle Réseaux et Télécommunications &nbsp;
    Option <u>Administration et Sécurité des Réseaux (ASUR)</u>
  </div>

  <table class="info-table">
    <tr>
      <td style="width:25%">Nom(s) et Prénom(s)</td>
      <td><strong>${etudiant.nom} ${etudiant.prenom}</strong></td>
    </tr>
    <tr>
      <td>Date et lieu de naissance</td>
      <td>${etudiant.dateNaissance ? `Né[e] le ${etudiant.dateNaissance} à ${etudiant.lieuNaissance || 'N/A'}` : 'N/A'}</td>
    </tr>
  </table>

  <div class="rang-annuel">
    Rang de l'étudiant à l'année : <strong>${rangAnnuel ? `${rangAnnuel}/${nbEtudiants}` : '#REF!'}</strong>
  </div>

  <table class="notes-table">
    <thead>
      <tr>
        <th style="text-align:left;width:35%"></th>
        <th>Coefficients</th>
        <th>Notes</th>
        <th>Rang</th>
        <th>Moyenne de classe</th>
      </tr>
    </thead>
    <tbody>
      <tr class="bilan-header"><td colspan="5" style="text-align:left">Bilan annuel</td></tr>
      <tr class="sem-row">
        <td style="text-align:left;padding-left:16px">Semestre 1</td>
        <td>18</td>
        <td style="color:${(resultatS5?.moyenneSemestre ?? 0) >= 10 ? '#003399' : '#cc0000'};font-weight:bold">${fmt(resultatS5?.moyenneSemestre)}</td>
        <td>#REF!</td>
        <td>#REF!</td>
      </tr>
      <tr>
        <td style="text-align:left;padding-left:16px">Semestre 2</td>
        <td>24</td>
        <td style="color:${(resultatS6?.moyenneSemestre ?? 0) >= 10 ? '#003399' : '#cc0000'};font-weight:bold">${fmt(resultatS6?.moyenneSemestre)}</td>
        <td>#REF!</td>
        <td>#REF!</td>
      </tr>
      <tr class="annuel-row">
        <td style="text-align:left;padding-left:24px">Annuel</td>
        <td>42</td>
        <td style="color:${(resultatAnnuel?.moyenneAnnuelle ?? 0) >= 10 ? '#003399' : '#cc0000'}">${fmt(resultatAnnuel?.moyenneAnnuelle)}</td>
        <td>${rangAnnuel ? `${rangAnnuel}/${nbEtudiants}` : '#REF!'}</td>
        <td>#REF!</td>
      </tr>
    </tbody>
  </table>

  <p>Décision du Conseil d'Etablissement :</p>
  <p>Mention : <strong>${mention}</strong></p>

  <div class="decision-box">Décision du Jury : ${decision}</div>

  <div class="signature-block">
    <div class="signature">
      Le Responsable pédagogique<br><br><br>
      Signature : _______________
    </div>
    <div class="signature">
      Le Chef de département<br><br><br>
      Signature : _______________
    </div>
  </div>

  <div class="footer-text">
    Il ne sera délivré qu'un seul et unique exemplaire de bulletins de notes !
  </div>
</body>
</html>`;

  return html;
};

module.exports = {
  genererBulletinSemestre,
  genererBulletinAnnuel,
  genererBulletinHTML,
  genererBulletinAnnuelHTML
};