'use strict';

const app = require('./app');
const { sequelize, Parametrage } = require('./src/models/index');
require('dotenv').config();

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL réussie');

    await sequelize.sync({ alter: false });
    console.log('✅ Base de données synchronisée');


    // Initialisation des paramètres par défaut
    const parametresDefaut = [
      { cle: 'POIDS_CC', valeur: '0.4', description: 'Pondération du contrôle continu (défaut: 40%)' },
      { cle: 'POIDS_EXAMEN', valeur: '0.6', description: 'Pondération de l\'examen final (défaut: 60%)' },
      { cle: 'PENALITE_ABSENCE', valeur: '0.01', description: 'Pénalité par heure d\'absence (défaut: 0.01 point)' },
      { cle: 'CREDITS_SEMESTRE', valeur: '30', description: 'Crédits requis pour valider un semestre' },
      { cle: 'CREDITS_ANNUEL', valeur: '60', description: 'Crédits requis pour être diplômé' }
    ];

    for (const param of parametresDefaut) {
      await Parametrage.findOrCreate({ where: { cle: param.cle }, defaults: param });
    }
    console.log('✅ Paramètres initialisés');

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Erreur de démarrage :', error);
    process.exit(1);
  }
}

startServer();