'use strict';

const express = require('express');
const router = express.Router();
const { telechargerBulletinSemestre, telechargerBulletinAnnuel, telechargerBulletinHTML, telechargerBulletinAnnuelHTML } = require('../controllers/bulletin.controller');
const { verifierToken } = require('../middlewares/auth.middleware');

router.use(verifierToken);

router.get('/:etudiantId/semestre/:semestreId', telechargerBulletinSemestre);
router.get('/:etudiantId/annuel', telechargerBulletinAnnuel);
router.get('/:etudiantId/semestre/:semestreId/html', telechargerBulletinHTML);
router.get('/:etudiantId/annuel/html', telechargerBulletinAnnuelHTML);




module.exports = router;