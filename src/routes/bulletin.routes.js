'use strict';

const express = require('express');
const router = express.Router();
const { telechargerBulletinSemestre, telechargerBulletinAnnuel, telechargerBulletinHTML } = require('../controllers/bulletin.controller');
const { verifierToken } = require('../middlewares/auth.middleware');

router.use(verifierToken);

router.get('/:etudiantId/semestre/:semestreId', telechargerBulletinSemestre);
router.get('/:etudiantId/annuel', telechargerBulletinAnnuel);
router.get('/:etudiantId/semestre/:semestreId/html', telechargerBulletinHTML);



module.exports = router;