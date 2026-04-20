'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/etudiants', require('./src/routes/etudiant.routes'));
app.use('/api/referentiel', require('./src/routes/referentiel.routes'));
app.use('/api/notes', require('./src/routes/note.routes'));
app.use('/api/bulletins', require('./src/routes/bulletin.routes'));
app.use('/api/import', require('./src/routes/import.routes'));
app.use('/api/export', require('./src/routes/export.routes'));
app.use('/api/audit', require('./src/routes/audit.routes'));

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: 'API Gestion Bulletins INPTIC ✅',
    version: '1.0.0',
    status: 'opérationnelle'
  });
});

module.exports = app;