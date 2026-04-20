'use strict';

const { exporterReleveNotesSemestre, exporterDecisionsJury } = require('../services/export.service');

const exporterReleve = async (req, res) => {
  try {
    const { semestreId } = req.params;
    const workbook = await exporterReleveNotesSemestre(semestreId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=releve_notes_semestre${semestreId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: 'Erreur export.', erreur: error.message });
  }
};

const exporterJury = async (req, res) => {
  try {
    const workbook = await exporterDecisionsJury();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=decisions_jury.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: 'Erreur export.', erreur: error.message });
  }
};

module.exports = { exporterReleve, exporterJury };