# 🎮 Ultimate Tic-Tac-Toe

> Jeu web multijoueur déployé sur le cloud — développé sur Android/Termux

**Auteur** : Antoine Dehoux  
**Stack** : HTML / CSS / JavaScript / Node.js / WebSocket / PostgreSQL / Railway  
**Repo GitHub** : https://github.com/AntoineDeh/Ultimate_TTT  
**URL de production** : https://ultimatettt-production.up.railway.app

---

## 📋 Sommaire

1. [Présentation](#1-présentation)
2. [Mise en place](#2-mise-en-place)
3. [Déploiement Railway](#3-déploiement-railway)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Règles du jeu](#5-règles-du-jeu)
6. [Modes de jeu](#6-modes-de-jeu)
7. [Fonctionnalités](#7-fonctionnalités)
8. [Architecture technique](#8-architecture-technique)
9. [Défis disponibles](#9-défis-disponibles)
10. [Dépannage](#10-dépannage)

---

## 1. Présentation

Ultimate Tic-Tac-Toe est une version avancée du morpion classique sur une grille 9×9. Développé entièrement en JavaScript vanilla, optimisé pour mobile Android, déployé sur Railway avec base de données PostgreSQL persistante.

### Fonctionnalités principales

- **Système de comptes** : inscription / connexion JWT / bcrypt / reset mot de passe par email
- **3 modes de jeu** : local 2 joueurs, contre IA (3 niveaux), multijoueur en ligne
- **Multijoueur** : rooms privées avec code + matchmaking automatique
- **IA minimax** alpha-bêta avec table de transposition, profondeur jusqu'à 8
- **20 thèmes visuels** animés avec emojis dynamiques
- **Statistiques et rang** (0 à 1000 pts) persistés en base de données
- **47 défis permanents + 15 défis journaliers rotatifs** avec système de réclamation
- **Analyse de partie** coup par coup
- **Mode Tournoi** (premier à 3 manches) — tous modes
- **Horloge par tour** paramétrable (15s / 30s / 60s) avec timer circulaire autour de l'avatar
- **Sons** synthétisés (Web Audio API) + retour haptique
- **Chat** en ligne style Plato
- **Grille SVG overlay** — lignes fines sur fond transparent, homogène sur tous les thèmes

### Fichiers du projet

```
Ultimate_TTT/
├── index.html       # Jeu complet — HTML + CSS + JavaScript (~5400 lignes)
├── server.js        # Serveur Node.js — Auth, WebSocket, rooms, matchmaking
├── package.json     # Dépendances Node.js
├── nixpacks.toml    # Configuration de build Railway
└── README.md        # Ce fichier
```

---

## 2. Mise en place

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
alias ttt-update='cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && echo "Jeu mis à jour !"'
alias ttt-update-server='cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/ && echo "Serveur mis à jour !"'
```

```bash
source ~/.bashrc
```

### 2.5 Workflow de développement

```
1. Modifier index.html ou server.js
2. Copier :  ttt-update  /  ttt-update-server
3. Push :    cd ~/Ultimate_TTT_fix
             git add -A && git commit -m "description" && git push origin main
4. Railway redéploie automatiquement (~1 min)
```

---

## 3. Déploiement Railway

### 3.1 Créer le projet

1. **railway.app** → Login with GitHub
2. **New Project** → Deploy from GitHub repo → `AntoineDeh/Ultimate_TTT`

### 3.2 Ajouter PostgreSQL

Projet Railway → **+ New** → **Database** → **Add PostgreSQL**

Dans le service **Ultimate_TTT** → **Variables** :
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

La table `users` est créée automatiquement au premier démarrage.

### 3.3 Paramètres importants

- **Settings → Serverless** : **désactivé** (WebSocket nécessite un serveur permanent)
- **Settings → Networking → Generate Domain** pour l'URL publique

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

À configurer dans Railway → **Ultimate_TTT** → **Variables** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Clé secrète JWT | `ttt_mon_secret_xyz` |
| `APP_URL` | URL publique du jeu | `https://ultimatettt-production.up.railway.app` |
| `BREVO_SMTP_USER` | Login SMTP Brevo | `a8b1e3001@smtp-brevo.com` |
| `BREVO_SMTP_PASS` | Clé API Brevo | `xkeysib-...` |
| `BREVO_FROM` | Email expéditeur vérifié Brevo | `ultimatettt.noreply@gmail.com` |

> L'expéditeur `BREVO_FROM` doit être vérifié dans Brevo → **Transactionnel** → **Expéditeurs**.

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
- **Désactivée** : cases gagnantes surlignées en jaune

---

## 6. Modes de jeu

### ◈ Local — 2 joueurs

Deux joueurs sur le même appareil. Pseudo J1 pré-rempli depuis le profil connecté. Pas de stats enregistrées.

### ◆ Contre le Bot

| Niveau | Algorithme | Comportement |
|--------|-----------|-------------|
| 🟢 Facile | Minimax profondeur 1 (70%) + aléatoire (30%) | Fait des erreurs intentionnelles |
| 🟡 Moyen | Minimax alpha-bêta profondeur 3 | Voit 3 coups à l'avance |
| 🔴 Difficile | Minimax + table transposition + move ordering, profondeur 8 | Très fort, 5s max par coup |

### ◉ En ligne

WebSocket vers Railway. Horloge toujours active (filet de sécurité 35s côté serveur).

**🌐 PUBLIC** : matchmaking automatique  
**🔒 PRIVÉ** : code 4 lettres — créer / rejoindre / partager. Le rejoignant hérite automatiquement des paramètres du créateur (auto-complétion, tournoi).

---

## 7. Fonctionnalités

### 7.1 Système d'authentification

| Feature | Description |
|---------|-------------|
| Inscription | Pseudo, email, mot de passe (6 car. min), avatar emoji (24 choix) |
| Connexion | Email + mot de passe, 👁️ afficher/masquer, email mémorisé |
| Auto-login | JWT 30 jours en localStorage |
| Mot de passe oublié | Lien de réinitialisation par email (Brevo API HTTP, 15 min) |
| Changer d'avatar | Bouton ⋯ du profil → picker emoji |
| Changer de pseudo | Bouton ✏️ dans le menu ⋯ du profil |
| Supprimer le compte | Double confirmation, suppression en base |
| Sécurité | bcrypt 10 rounds, JWT signé, protection double email |

### 7.2 Base de données PostgreSQL

Table `users` créée automatiquement. Stats stockées en JSONB, survivent aux redéploiements.

### 7.3 Interface en jeu

| Élément | Action |
|---------|--------|
| ⌂ haut gauche | Retour menu (confirmation si partie en cours) |
| 💡 haut gauche | Indice (3/manche) |
| ⋯ haut droite | Règles, son, thème, abandon |
| ↩ bas | Annuler coup (bot uniquement) |
| ▶ REJOUER / MANCHE SUIVANTE | Nouvelle manche |
| 💬 bas | Chat en ligne (visible uniquement en jeu) |

### 7.4 Grille de jeu

Style **SVG overlay** : cellules transparentes, lignes de grille dessinées par-dessus en SVG (fines entre cellules, épaisses entre sous-grilles). Homogène sur tous les thèmes. Sous-grille active encadrée en **doré pulsant**.

### 7.5 Timer circulaire

Cercle SVG autour de l'avatar du joueur courant. Couleur : vert → jaune → rouge au fil du temps. Secondes restantes affichées sous l'avatar. Pas de barre timer séparée.

### 7.6 Design et thèmes — 20 designs

Chaque thème modifie fond, couleurs, animations, emojis des pièces et logo du menu.

| Thème | X | O | | Thème | X | O |
|-------|---|---|-|-------|---|---|
| 🤖 Cyberpunk | X | O | | 🔥 Enfer | 😈 | 💀 |
| 🎮 Mario | 🍄 | ⭐ | | 🚀 Espace | 👾 | 🛸 |
| 🌴 Jungle | 🦁 | 🐸 | | 🌆 Synthwave | 🎸 | 🌴 |
| 👸 Princesse | 🌸 | 💎 | | 🧊 Glace | ❄️ | 💎 |
| 🌊 Ocean | 🐙 | 🦈 | | ⚡ Storm | ⚡ | 🌩️ |
| 🏯 Japon | ⛩️ | 🌸 | | 🎃 Halloween | 🎃 | 👻 |
| 🧊 Arctique | 🐻‍❄️ | 🦊 | | 🌺 Hawaii | 🌺 | 🐠 |
| 🏔️ Montagne | 🦅 | 🐺 | | 🎭 Théâtre | 😂 | 😢 |
| 🧪 Labo | ⚗️ | 🧬 | | 🔩 Rouille | 🔩 | ⚙️ |

### 7.7 Avatars en ligne

Avatar emoji visible dans le scoreboard et autour du cercle timer pendant les parties en ligne.

### 7.8 Mode Tournoi

Premier à 3 manches gagnées. Bouton "MANCHE SUIVANTE". Chaque manche enregistre ses stats.

### 7.9 Statistiques et rang

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
**Bonus** : streak, victoire rapide, défis réclamés.  
**Malus** : -25 par défaite (protégé sous 100 pts).

### 7.10 Système de défis

- **Point rouge** sur le bouton DÉFIS quand un défi est complété et non réclamé
- Dans l'écran DÉFIS : bouton **"+X pts"** pour réclamer chaque défi complété
- Les points s'ajoutent au rang à la réclamation
- 3 défis journaliers tirés chaque jour, renouvelés à minuit

### 7.11 Fond immersif

Scanlines animées, halo pulsant, 18 particules flottantes colorées qui s'adaptent au thème actif.

### 7.12 Easter egg

3 clics rapides sur **ULTIMATE TTT** → mot de passe `Antoine` → +3 indices. 3 échecs → ferme la page.

---

## 8. Architecture technique

### 8.1 Backend (server.js)

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
| `create_room` | Créer une room (envoie autoMode + tournament) |
| `join_room` | Rejoindre par code |
| `matchmake` | Entrer en matchmaking |
| `cancel_matchmake` | Quitter la file |
| `move` | Jouer un coup |
| `reset` | Nouvelle manche |
| `automode` | Réglage auto-complétion + tournoi |
| `chat` | Envoyer un message |
| `abandon` | Abandonner (notifie l'adversaire de sa victoire) |

**Messages WebSocket serveur → client :**

| Message | Description |
|---------|-------------|
| `auth_ok` | Socket authentifié |
| `role` | X ou O |
| `roomId` | Code de la room |
| `state` | État complet de la partie |
| `names` | Pseudos + avatars |
| `automode` | Paramètres room (autoMode + tournament) |
| `waiting` | Adversaire déconnecté |
| `ready` | Partie prête |
| `matched` | Adversaire trouvé |
| `chat` | Message reçu |
| `abandon` | L'adversaire a abandonné → tu gagnes |

### 8.2 Algorithme minimax

Minimax avec alpha-bêta, table de transposition, move ordering, deepening itératif jusqu'à profondeur 8.

### 8.3 Envoi d'emails (Brevo API HTTP)

Reset mot de passe via API HTTP Brevo — contourne les restrictions SMTP de Railway. Réponse immédiate au client, email envoyé en arrière-plan.

---

## 9. Défis disponibles

### Défis journaliers (3 tirés par jour parmi 15)

Renouvelés chaque jour. Visibles en premier dans l'écran DÉFIS avec le badge **JOUR**.

| Défi | Points | Condition |
|------|--------|-----------|
| 🎯 Chasseur du jour | 15 | Gagner 1 partie |
| 🔥 Triple menace | 35 | Gagner 3 parties |
| 💥 Inarrêtable du jour | 60 | Gagner 5 parties |
| 🎮 Joueur du jour | 20 | Jouer 3 parties |
| 🕹️ Marathon du jour | 30 | Jouer 5 parties |
| 🤖 Anti-bot du jour | 25 | Battre le bot 2 fois |
| 🌍 Duel en ligne | 40 | Gagner 1 partie en ligne |
| 🔴 Défi Difficile | 50 | Battre le bot Difficile |
| ⚡ Mini-série | 30 | Enchaîner 2 victoires |
| 🚫 Pas de pitié | 25 | Gagner 2 parties sans match nul |
| 💨 Sprinter du jour | 45 | Gagner en moins de 15 coups |
| 🌐 Compétiteur | 30 | Jouer 2 parties en ligne |
| 🏆 Tournoi du jour | 55 | Remporter un tournoi |
| 🔄 Revenant du jour | 20 | Gagner après avoir perdu |
| 🎰 Journée dédiée | 70 | Jouer 10 parties |

### Défis permanents (47)

**Premiers pas**

| Défi | Points | Condition |
|------|--------|-----------|
| 🎮 Première partie | 10 | Lancer 1 partie |
| 🥳 Première victoire | 20 | Gagner 1 partie |
| 🌐 Baptême du feu | 30 | Jouer en ligne |

**Bot**

| Défi | Points | Condition |
|------|--------|-----------|
| 🟢 Trop facile | 20 | Battre bot Facile |
| 🟡 Niveau intermédiaire | 40 | Battre bot Moyen |
| 🔴 Machine brisée | 80 | Battre bot Difficile |
| 🧹 Balayage | 60 | Battre les 3 niveaux |
| 🤯 Dompteur de machines | 120 | Battre bot Difficile 3 fois |
| 🤖 Exterminateur | 80 | Gagner 20× bot Facile |
| 🧠 Stratège | 120 | Gagner 10× bot Moyen |

**Tournoi**

| Défi | Points | Condition |
|------|--------|-----------|
| 🏆 Champion local | 30 | Gagner 1 tournoi |
| 👑 Grand tournoi | 100 | Gagner 1 tournoi vs bot Difficile |
| 🏅 Grand Chelem | 150 | Tournoi gagné dans chaque mode |
| 🎖️ Guerrier de tournoi | 80 | Gagner 5 tournois |

**Streak**

| Défi | Points | Condition |
|------|--------|-----------|
| 🔥 En feu | 25 | 3 victoires d'affilée |
| 💥 Inarrêtable | 60 | 5 victoires d'affilée |
| ⚡ Légende vivante | 150 | 10 victoires d'affilée |
| 🔗 Enchaîneur en ligne | 80 | 3 victoires en ligne d'affilée |
| 👑 Roi en ligne | 150 | 5 victoires en ligne d'affilée |

**Style**

| Défi | Points | Condition |
|------|--------|-----------|
| ⚡ Victoire express | 40 | Gagner en moins de 20 coups |
| ⚡ Éclair | 60 | Gagner en moins de 10 coups |
| 🏃 Marathon | 75 | Partie de plus de 60 coups |
| 🎖️ Vétéran | 50 | Jouer 50 parties |
| 💯 Centurion | 100 | Jouer 100 parties |
| 🥊 Cinquante victoires | 100 | Gagner 50 parties |
| 🎰 Deux cents victoires | 250 | Gagner 200 parties |
| 🙈 Sans filet | 50 | Gagner 5 parties sans indice |

**Assiduité**

| Défi | Points | Condition |
|------|--------|-----------|
| 📅 Premier jour | 10 | Jouer 1 jour |
| 🗓️ Habitué | 30 | 3 jours consécutifs |
| 🔥 Une semaine | 70 | 7 jours consécutifs |
| 🏆 Un mois ! | 200 | 30 jours consécutifs |
| 📆 Meilleure série | 50 | Meilleure série de 7 jours |
| 🛋️ Week-end gamer | 20 | Jouer samedi ET dimanche |
| 🌅 Lève-tôt | 25 | Jouer avant 7h du matin |

**Insolite**

| Défi | Points | Condition |
|------|--------|-----------|
| 🤝 Pacifiste | 35 | 5 matchs nuls |
| 💀 Apprenti masochiste | 25 | Perdre 10 parties |
| 🌍 Conquistador | 90 | Gagner 5 parties en ligne |
| 🏳️ Connexion courageuse | 15 | Perdre 1 partie en ligne |
| 🤲 Match nul en ligne | 45 | Faire un nul en ligne |
| 🎭 Touche-à-tout | 40 | Jouer dans les 3 modes |
| 🔄 Revenant | 45 | Gagner après 3 défaites consécutives |
| 💪 Rocky | 75 | Battre bot Difficile après 3 défaites consécutives |
| 🔥 Rang Légende | 200 | Atteindre 950+ pts |
| 🎨 Caméléon | 20 | Changer de thème 5 fois |
| 🌈 Collectionneur | 40 | Jouer avec 5 thèmes différents |
| 🦉 Chouette de nuit | 30 | Jouer après minuit |
| 🌙 Victoire nocturne | 35 | Gagner après minuit |

---

## 10. Dépannage

| Symptôme | Cause | Solution |
|----------|-------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | `DATABASE_URL` non transmise | Vérifier variable Railway + redéployer |
| Mail non reçu | Expéditeur non vérifié Brevo | Vérifier Brevo → Expéditeurs → Vérifié |
| Mail non reçu | Clé API incorrecte | `BREVO_SMTP_PASS` doit être `xkeysib-...` (clé API, pas mot de passe SMTP) |
| Son persistant après retour menu | setTimeout bot non annulé | Résolu — vérification `mode === 'bot'` dans le callback |
| Point rouge défis sans défi gagné | Migration _challengesClaimed manquante | Résolu — auto-migration au premier chargement |
| `git push` refusé | Branches divergentes | `git pull && git push` |
| Railway build échoue | node_modules dans le repo | `node_modules/` dans `.gitignore` |
| Serverless activé | WebSocket coupé | Désactiver Serverless dans Settings Railway |
| Chat visible hors jeu | Persistance entre sessions | Résolu — hideChatBar() dans startLocal/startBot/backToMenu |

---

*Développé par Antoine Dehoux sur Android/Termux*  
*Stack : HTML · CSS · JavaScript · Node.js · WebSocket · PostgreSQL · JWT · Brevo · Railway*
