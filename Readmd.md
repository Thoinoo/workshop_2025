# Workshop 2025 — Guide d'installation

Ce dépôt contient une API Node.js (Express + Socket.IO) et une interface React propulsée par Vite.
Ce guide explique comment installer les dépendances, configurer les variables d'environnement et démarrer les deux services en local.

## 1. Prérequis

- **Node.js 18+** (inclut npm). Vérifiez votre version avec `node -v`.
- **npm** (installé avec Node.js). Vérifiez votre version avec `npm -v`.

## 2. Cloner le projet

```bash
git clone <url-du-repo>
cd workshop_2025
```

> Adaptez `<url-du-repo>` à l'URL réelle de votre dépôt Git.

## 3. Installation des dépendances

Le projet est composé de deux sous-dossiers :

- `api` : serveur Express + Socket.IO
- `workshop-2025` : application React/Vite

Installez les dépendances pour chaque partie :

```bash
# Dans le dossier racine du projet
cd api
npm install

cd ../workshop-2025
npm install
```

## 4. Configuration des variables d'environnement

### API (`api/.env`)

L'API lit ses variables d'environnement avec `dotenv`. Créez un fichier `.env` dans `api/` si vous souhaitez personnaliser le port ou ajouter d'autres valeurs.

```bash
PORT=3000
```

Le port par défaut est `3000` si aucun fichier `.env` n'est fourni.

### Front-end (`workshop-2025/.env`)

L'application React utilise Socket.IO côté client. Vous pouvez configurer l'URL du serveur via les variables suivantes :

```bash
VITE_SOCKET_URL=http://localhost:3000
# VITE_SOCKET_PORT=3000  # Optionnel : port séparé si vous utilisez VITE_SOCKET_URL
```

Si aucun fichier `.env` n'est défini, l'application tentera de se connecter automatiquement au serveur Socket.IO en local (`http://localhost:3000`).

## 5. Démarrage des serveurs en développement

Ouvrez deux terminaux distincts (ou utilisez des onglets multiplexés) et lancez les commandes suivantes.

### API

```bash
cd api
npm run dev
```

Cette commande démarre le serveur Express avec `nodemon` sur `http://localhost:3000` (port configurable via `.env`).

### Front-end

```bash
cd workshop-2025
npm run dev
```

Vite démarre l'application sur `http://localhost:5173` par défaut et se connecte automatiquement à l'API Socket.IO.

## 6. Scripts utiles

### API (`api/package.json`)

- `npm run dev` : lance le serveur avec `nodemon` (recharge automatique lors des modifications).
- `npm start` : lance le serveur en production (sans `nodemon`).

### Front-end (`workshop-2025/package.json`)

- `npm run dev` : démarre Vite en mode développement.
- `npm run build` : génère la build de production dans `workshop-2025/dist`.
- `npm run preview` : sert la build générée pour un test local.
- `npm run lint` : exécute ESLint sur le projet React.

## 7. Déploiement

1. Construisez l'interface :
   ```bash
   cd workshop-2025
   npm run build
   ```
2. Déployez le contenu de `workshop-2025/dist` sur votre hébergement statique.
3. Déployez l'API (dossier `api`) sur votre infrastructure Node.js en démarrant avec `npm start` et en configurant la variable `PORT`.
4. Assurez-vous que `VITE_SOCKET_URL` (ou `VITE_SOCKET_PORT`) pointe vers l'URL publique de l'API Socket.IO.

## 8. Arborescence du projet

```
.
├── api/              # Serveur Express + Socket.IO
├── workshop-2025/    # Application React + Vite
├── package-lock.json # Verrouillage racine (monorepo npm si nécessaire)
└── README.md         # Ce guide
```

Vous disposez désormais de toutes les informations nécessaires pour installer et lancer le projet en local.