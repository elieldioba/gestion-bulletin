# Image Node.js
FROM node:18-alpine

# Dossier de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier tout le projet
COPY . .

# Créer le dossier uploads
RUN mkdir -p uploads

# Port exposé
EXPOSE 3000

# Démarrer le serveur
CMD ["node", "server.js"]