# 🎮 Ultimate Tic-Tac-Toe

> Jeu web multijoueur déployé sur le cloud — développé sur Android/Termux

**Auteur** : Antoine Dehoux  
**Stack** : HTML / CSS / JavaScript / Node.js / WebSocket / PostgreSQL / Railway  
**Repo GitHub** : https://github.com/AntoineDeh/Ultimate_TTT  
**URL de production** : https://ultimatettt-production.up.railway.app

---

## 📋 Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Mise en place de l'environnement](#2-mise-en-place-de-lenvironnement)
3. [Déploiement sur Railway](#3-déploiement-sur-railway)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Règles du jeu](#5-règles-du-jeu)
6. [Modes de jeu](#6-modes-de-jeu)
7. [Fonctionnalités développées](#7-fonctionnalités-développées)
8. [Architecture technique](#8-architecture-technique)
9. [Dépannage](#9-dépannage)

---

## 1. Présentation du projet

Ultimate Tic-Tac-Toe est une version avancée du morpion classique sur une grille 9×9. Développé entièrement en JavaScript vanilla, optimisé pour mobile Android, déployé sur Railway avec base de données PostgreSQL persistante.

### Fonctionnalités principales

- **Système de comptes** : inscription / connexion / JWT / bcrypt / réinitialisation mot de passe par email
- **3 modes de jeu** : local 2 joueurs, contre IA (3 niveaux), multijoueur en ligne
- **Multijoueur** : rooms privées avec code + matchmaking automatique
- **IA minimax** alpha-bêta avec table de transposition, profondeur jusqu'à 8
- **20 thèmes visuels** animés avec emojis dynamiques
- **Statistiques et rang** (0 à 1000 points) persistés en base de données
- **Analyse de partie** coup par coup avec évaluation de qualité
- **Mode Tournoi** (premier à 3 manches) — tous modes
- **Horloge par tour** paramétrable (15s / 30s / 60s)
- **Sons** synthétisés (Web Audio API) + retour haptique
- **Chat** en ligne style Plato (barre persistante + drawer)

### Fichiers du projet

```
Ultimate_TTT/
├── index.html       # Jeu complet — HTML + CSS + JavaScript
├── server.js        # Serveur Node.js — Auth, WebSocket, rooms, matchmaking
├── package.json     # Dépendances Node.js
├── nixpacks.toml    # Configuration de build Railway
└── README.md        # Ce fichier
```

---

## 2. Mise en place de l'environnement

Développement réalisé sur **Android via Termux**.

### 2.1 Installer Termux et les dépendances

```bash
termux-setup-storage
pkg update && pkg upgrade -y
pkg install nodejs git -y
```

### 2.2 Cloner le projet

```bash
git clone https://github.com/AntoineDeh/Ultimate_TTT.git ~/Ultimate_TTT_fix
cd ~/Ultimate_TTT_fix
npm install
```

### 2.3 Configurer Git

```bash
git config --global user.email "email@example.com"
git config --global user.name "Prénom Nom"
git config pull.rebase false
```

### 2.4 Alias Termux

```bash
nano ~/.bashrc
```

Ajouter :

```bash
# === Ultimate TTT ===
alias ttt-update='cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && echo "Jeu mis à jour !"'
alias ttt-update-server='cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/ && echo "Serveur mis à jour !"'
```

```bash
source ~/.bashrc
```

### 2.5 Workflow de développement

```
1. Modifier index.html ou server.js
2. Copier dans le projet :
      ttt-update          → index.html
      ttt-update-server   → server.js
3. Push :
      cd ~/Ultimate_TTT_fix
      git add -A && git commit -m "description" && git push
4. Railway redéploie automatiquement (~1 min)
```

**Commande complète :**

```bash
ttt-update && cd ~/Ultimate_TTT_fix && git add -A && git commit -m "description" && git push origin main
```

---

## 3. Déploiement sur Railway

### 3.1 Créer le projet

1. **railway.app** → Login with GitHub
2. **New Project** → Deploy from GitHub repo → `AntoineDeh/Ultimate_TTT`

### 3.2 Ajouter PostgreSQL

Dans le projet Railway → **+ New** → **Database** → **Add PostgreSQL**  
Railway crée automatiquement la variable `DATABASE_URL` dans le service Postgres.

Dans le service **Ultimate_TTT** → **Variables** → ajouter :
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

La table `users` est créée automatiquement au premier démarrage.

### 3.3 Paramètres importants

- **Settings → Serverless** : **désactivé** (WebSocket nécessite un serveur permanent)
- **Settings → Networking** → **Generate Domain** pour l'URL publique

### 3.4 Fichiers de configuration

**package.json** :
```json
{
  "name": "ultimate-ttt",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "ws": "^8.20.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.0",
    "nodemailer": "^6.9.0"
  }
}
```

**nixpacks.toml** :
```toml
[phases.install]
cmds = ["npm install"]

[start]
cmd = "node server.js"
```

---

## 4. Variables d'environnement

À configurer dans Railway → service **Ultimate_TTT** → **Variables** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL Railway | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Clé secrète pour les tokens JWT | `ttt_mon_secret_xyz` |
| `APP_URL` | URL publique du jeu | `https://ultimatettt-production.up.railway.app` |
| `BREVO_SMTP_USER` | Login SMTP Brevo | `a8b1e3001@smtp-brevo.com` |
| `BREVO_SMTP_PASS` | Clé API Brevo | `xkeysib-...` |
| `BREVO_FROM` | Email expéditeur vérifié dans Brevo | `ultimatettt.noreply@gmail.com` |

> **Note** : L'expéditeur `BREVO_FROM` doit être vérifié dans Brevo → **Transactionnel** → **Expéditeurs**.

---

## 5. Règles du jeu

### Le plateau

Grille 3×3 de sous-grilles, chacune étant un morpion 3×3. Total : 9×9 cases.

### Déroulement

- Le coup joué dans la **case C** envoie l'adversaire dans la **sous-grille C**
- Si la sous-grille imposée est terminée → liberté de jouer n'importe où
- Gagner une sous-grille = l'aligner sur la grille globale
- **Victoire** : aligner 3 sous-grilles sur la grille globale

### Option auto-complétion

- **Activée** : coup gagnant joué automatiquement
- **Désactivée** : cases gagnantes surlignées en jaune, le joueur clique

---

## 6. Modes de jeu

### ◈ Local — 2 joueurs

Deux joueurs sur le même appareil. Pseudos personnalisables (J1 pré-rempli depuis le profil connecté). Aucune statistique enregistrée.

### ◆ Contre le Bot

| Niveau | Algorithme | Comportement |
|--------|-----------|-------------|
| 🟢 Facile | Minimax profondeur 1 (70%) + coup aléatoire (30%) | Saisit les victoires immédiates, fait des erreurs |
| 🟡 Moyen | Minimax alpha-bêta profondeur 3 | Voir 3 coups à l'avance |
| 🔴 Difficile | Minimax + table transposition + move ordering, profondeur 8 | Très fort, 5s max par coup |

### ◉ En ligne

WebSocket vers Railway. Horloge toujours active (filet sécurité 35s côté serveur).

**🌐 PUBLIC** : matchmaking automatique par réglage auto-complétion  
**🔒 PRIVÉ** : code 4 lettres — créer / rejoindre / partager (📋 copier ou 📤 partager natif)

---

## 7. Fonctionnalités développées

### 7.1 Système d'authentification

- **Inscription** : pseudo, email, mot de passe (6 car. min), avatar emoji (24 choix)
- **Connexion** : email + mot de passe, affichage/masquage avec 👁️
- **Auto-login** : JWT stocké en localStorage, valable 30 jours
- **Email mémorisé** : pré-rempli à la prochaine ouverture
- **Mot de passe oublié** : lien de réinitialisation envoyé par email (Brevo, valable 15 min)
- **Profil** : avatar modifiable depuis le menu ⋯ du profil
- **Suppression de compte** : double confirmation, suppression en base

**Sécurité** : mots de passe hashés bcrypt (10 rounds), tokens JWT signés, protection double email.

### 7.2 Base de données PostgreSQL

Table `users` créée automatiquement :

```sql
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  pseudo        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar        TEXT DEFAULT '🎮',
  stats         JSONB DEFAULT '{}',
  reset_token   TEXT,
  reset_expires BIGINT,
  created_at    TEXT
)
```

Les statistiques sont persistées en base et survivent aux redéploiements.

### 7.3 Interface en jeu

| Élément | Emplacement | Action |
|---------|-------------|--------|
| ⌂ | Haut gauche | Retour au menu |
| 💡 | Haut gauche | Indice (3/manche) |
| ⋯ | Haut droite | Règles, son, thème, abandon |
| ↩ | Bas | Annuler coup (bot uniquement) |
| ▶ REJOUER | Bas | Nouvelle manche (bot + tournoi) |
| 💬 | Bas | Chat en ligne |

### 7.4 Mode Tournoi

Premier à **3 manches** gagnées. Bannière avec pip-row animée. Bouton "MANCHE SUIVANTE" entre les manches. Chaque manche enregistre ses propres statistiques.

### 7.5 Horloge par tour

**15s / 30s / 60s** sélectionnables dans le setup. Barre de progression sous le turn-banner. Alerte visuelle + sonore sous les 8 dernières secondes. Timeout → coup aléatoire automatique.

### 7.6 Chat en ligne (style Plato)

Barre persistante visible uniquement quand la partie est en cours. Tap → drawer avec conversation complète, 7 raccourcis rapides, champ libre (Entrée = envoyer).

### 7.7 Avatars en ligne

L'avatar emoji choisi à l'inscription est visible dans le scoreboard et la bannière de tour pendant les parties en ligne.

### 7.8 Sons et haptique

Sons synthétisés via Web Audio API (aucun fichier externe). Patterns de vibration distincts par événement.

### 7.9 Analyse de partie

Après chaque partie (local + bot) : meilleur coup calculé pour chaque position, comparé au coup joué. Navigation ← → coup par coup. Qualités : Excellent / Bon / Imprécis / Erreur / Gaffe.

### 7.10 Thèmes — 20 designs

| Thème | X | O | | Thème | X | O |
|-------|---|---|-|-------|---|---|
| 🤖 Cyberpunk | X | O | | 🌊 Ocean | 🐙 | 🦈 |
| 🎮 Mario | 🍄 | ⭐ | | 🔥 Enfer | 😈 | 💀 |
| 🌴 Jungle | 🦁 | 🐸 | | 🚀 Espace | 👾 | 🛸 |
| 👸 Princesse | 🌸 | 💎 | | 🌆 Synthwave | 🎸 | 🌴 |
| 🧊 Glace | ❄️ | 💎 | | ⚡ Storm | ⚡ | 🌩️ |
| 🏯 Japon | ⛩️ | 🌸 | | 🧪 Labo | ⚗️ | 🧬 |
| 🎃 Halloween | 🎃 | 👻 | | 🌺 Hawaii | 🌺 | 🐠 |
| 🏔️ Montagne | 🦅 | 🐺 | | 🎭 Théâtre | 😂 | 😢 |
| 🔩 Rouille | 🔩 | ⚙️ | | 🎮 Mario | 🍄 | ⭐ |
| 🌊 Arctique | 🐻‍❄️ | 🦊 | | 🌿 Forêt | 🌿 | 🍄 |

### 7.11 Statistiques et rang

**Données par mode** : victoires / défaites / égalités / streak / meilleur streak / victoire la plus rapide / partie la plus longue.

**Rangs :**

| Rang | Points |
|------|--------|
| 🥉 Recrue | 0 – 199 |
| 🥈 Challenger | 200 – 399 |
| 🥇 Expert | 400 – 599 |
| 💎 Maître | 600 – 799 |
| 👑 Grand Maître | 800 – 949 |
| 🔥 Légende | 950 – 1000 |

**Points** : +75 online, +60 bot difficile, +35 bot moyen, +20 bot facile.  
**Bonus** : +20 victoire < 20 coups, ×1.2 streak ≥ 3, ×1.5 streak ≥ 5, +5 égalité.  
**Malus** : -25 par défaite (protégé sous 100 pts).

### 7.12 Easter egg

3 clics rapides sur **ULTIMATE TTT** → mot de passe `Antoine` → +3 indices. 3 échecs → ferme la page.

---

## 8. Architecture technique

### 8.1 Frontend (index.html)

Fichier HTML unique — HTML + CSS + JS vanilla. Aucun framework.

- **CSS** : 20 thèmes avec variables CSS, animations `@keyframes`, responsive mobile-first
- **JS** : logique jeu, IA minimax, client WebSocket, auth JWT, stats, son, haptique, timer, chat, tournoi

### 8.2 Backend (server.js)

Node.js + `ws` + `pg` + `bcryptjs` + `jsonwebtoken` + `nodemailer`.

**Routes HTTP :**

| Route | Méthode | Description |
|-------|---------|-------------|
| `/auth/register` | POST | Inscription |
| `/auth/login` | POST | Connexion |
| `/auth/me` | GET | Auto-login (vérifie JWT) |
| `/auth/profile` | PUT | Modifier pseudo/avatar |
| `/auth/stats` | PUT | Sync statistiques |
| `/auth/forgot` | POST | Demande reset mot de passe |
| `/auth/reset` | POST | Nouveau mot de passe (token) |
| `/auth/account` | DELETE | Supprimer le compte |
| `/` | GET | Servir index.html |

**Messages WebSocket client → serveur :**

| Message | Description |
|---------|-------------|
| `auth` | Authentifier le socket (JWT) |
| `create_room` | Créer une room privée |
| `join_room` | Rejoindre par code |
| `matchmake` | Entrer en matchmaking |
| `cancel_matchmake` | Quitter la file |
| `move` | Jouer un coup |
| `reset` | Nouvelle manche |
| `automode` | Réglage auto-complétion |
| `chat` | Envoyer un message |

**Messages WebSocket serveur → client :**

| Message | Description |
|---------|-------------|
| `auth_ok` | Socket authentifié |
| `role` | X ou O |
| `roomId` | Code de la room |
| `state` | État de la partie |
| `names` | Pseudos + avatars |
| `waiting` | Adversaire déconnecté |
| `ready` | Partie prête |
| `matched` | Adversaire trouvé |
| `chat` | Message reçu |

### 8.3 Algorithme minimax

Minimax avec alpha-bêta, table de transposition, move ordering, deepening itératif.

**Fonction d'évaluation :**
- ±100 pts par sous-grille gagnée/perdue
- ±50 pts pour 2 sous-grilles alignées avec une libre
- ±30/15 pts pour centre et coins de la grille globale

### 8.4 Envoi d'emails (Brevo)

Réinitialisation du mot de passe via l'API HTTP Brevo (contourne les restrictions SMTP de Railway). Le serveur répond immédiatement au client, l'email est envoyé en arrière-plan.

---

## 9. Dépannage

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Écran auth ne disparaît pas après connexion | Bug menu hidden | Vider le cache Chrome |
| `ECONNREFUSED 127.0.0.1:5432` | `DATABASE_URL` non transmise | Vérifier la variable dans Railway + redéployer |
| `Cannot find module 'nodemailer'` | node_modules dans git | `git rm -r --cached node_modules && npm install && git push` |
| Mail non reçu | Expéditeur non vérifié dans Brevo | Vérifier Brevo → Expéditeurs |
| Mail non reçu | SMTP bloqué par Railway | Utiliser l'API HTTP Brevo (actuel) |
| Users:0 après redéploiement | users.json écrasé | Migré vers PostgreSQL — résolu |
| `git push` refusé | Branches divergentes | `git pull && git push` |
| Railway : build échoue | node_modules dans le repo | Ajouter `node_modules/` dans `.gitignore` |
| Serverless activé | WebSocket coupé | Désactiver Serverless dans Settings Railway |
| Cache affiché dans l'œil mais Edit différent | Bug d'affichage Railway | La valeur dans Edit est la bonne |

---

*Développé par Antoine Dehoux sur Android/Termux*  
*Stack : HTML · CSS · JavaScript · Node.js · WebSocket · PostgreSQL · JWT · Brevo · Railway*
