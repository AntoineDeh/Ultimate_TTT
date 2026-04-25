# 🎮 Ultimate Tic-Tac-Toe

> Jeu web multijoueur mobile-first — développé sur Android/Termux, déployé sur Railway

**Auteur** : Antoine Dehoux  
**Stack** : HTML / CSS / JavaScript vanilla · Node.js · WebSocket · PostgreSQL · Railway  
**Repo** : https://github.com/AntoineDeh/Ultimate_TTT  
**Production** : https://ultimatettt-production.up.railway.app

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Mise en place](#2-mise-en-place)
3. [Déploiement Railway](#3-déploiement-railway)
4. [Variables d'environnement](#4-variables-denvironnement)
5. [Règles du jeu](#5-règles-du-jeu)
6. [Modes de jeu](#6-modes-de-jeu)
7. [Système de progression](#7-système-de-progression)
8. [Défis et quêtes](#8-défis-et-quêtes)
9. [Fonctionnalités détaillées](#9-fonctionnalités-détaillées)
10. [Architecture technique](#10-architecture-technique)
11. [Thèmes visuels](#11-thèmes-visuels)
12. [Dépannage](#12-dépannage)

---

## 1. Présentation

Ultimate Tic-Tac-Toe est une version avancée du morpion classique sur une grille 9x9, développée entièrement en JavaScript vanilla sans framework. Optimisé mobile Android, déployé sur Railway avec PostgreSQL persistant.

### Fichiers du projet

```
Ultimate_TTT/
├── index.html      # Jeu complet — HTML + CSS + JS (~5900 lignes)
├── server.js       # Serveur Node.js — Auth, WebSocket, rooms, matchmaking
├── package.json    # Dépendances Node.js
├── nixpacks.toml   # Configuration build Railway
└── README.md       # Ce fichier
```

---

## 2. Mise en place

Développement sur **Android via Termux**.

### 2.1 Installer les dépendances

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
git config --global user.name "Prenom Nom"
git config pull.rebase false
```

### 2.4 Alias Termux (~/.bashrc)

```bash
alias ttt-update='cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && echo "Jeu mis a jour !"'
alias ttt-update-server='cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/ && echo "Serveur mis a jour !"'
```

### 2.5 Workflow de developpement

```
1. Modifier index.html ou server.js
2. ttt-update  /  ttt-update-server
3. cd ~/Ultimate_TTT_fix
   git add -A && git commit -m "description" && git push origin main
4. Railway redeploie automatiquement (~1 min)
```

---

## 3. Déploiement Railway

### 3.1 Creer le projet

1. railway.app → Login with GitHub
2. New Project → Deploy from GitHub → AntoineDeh/Ultimate_TTT

### 3.2 Ajouter PostgreSQL

Projet → + New → Database → Add PostgreSQL

Variable a ajouter dans le service Ultimate_TTT :
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

La table users est creee automatiquement au premier demarrage.

### 3.3 Parametres importants

- Settings → Serverless : DESACTIVE (WebSocket necessite un serveur permanent)
- Settings → Networking → Generate Domain pour URL publique

### 3.4 package.json

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

### 3.5 nixpacks.toml

```toml
[phases.install]
cmds = ["npm install"]

[start]
cmd = "node server.js"
```

---

## 4. Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| DATABASE_URL | URL PostgreSQL | ${{Postgres.DATABASE_URL}} |
| JWT_SECRET | Cle secrete JWT | ttt_secret_xyz |
| APP_URL | URL publique Railway | https://ultimatettt-production.up.railway.app |
| BREVO_SMTP_USER | Login SMTP Brevo | a8b1e3001@smtp-brevo.com |
| BREVO_SMTP_PASS | Cle API Brevo | xkeysib-... |
| BREVO_FROM | Email expediteur verifie | ultimatettt.noreply@gmail.com |

BREVO_FROM doit etre verifie dans Brevo → Transactionnel → Expediteurs.

---

## 5. Règles du jeu

### Le plateau

Grille 3x3 de sous-grilles, chacune etant un morpion 3x3 — soit 81 cases au total.

### Deroulement

Le coup joue dans la case C d'une sous-grille envoie l'adversaire jouer dans la sous-grille C. Les cases et sous-grilles sont numerotees de 0 a 8, de gauche a droite et de haut en bas.

Exemple : jouer dans la case du milieu (4) oblige l'adversaire a jouer dans la sous-grille du milieu.

### Sous-grille bloquee

Si la sous-grille imposee est deja gagnee ou pleine, le joueur peut jouer dans n'importe quelle sous-grille encore active.

### Victoire

Aligner 3 sous-grilles remportees sur la grille globale (ligne, colonne ou diagonale). Si toutes les sous-grilles sont terminees sans alignement → match nul.

### Option auto-completion

Activee : coup gagnant dans une sous-grille joue automatiquement. Desactivee : les cases gagnantes sont surlignees en jaune.

---

## 6. Modes de jeu

### Local — 2 joueurs

Deux joueurs sur le meme appareil a tour de role. Pas de stats enregistrees.

### Contre le Bot

| Niveau | Algorithme | Comportement |
|--------|-----------|-------------|
| Facile | Minimax profondeur 1 + 30% aleatoire | Fait des erreurs intentionnelles |
| Moyen | Minimax alpha-beta profondeur 3 | Voit 3 coups a l'avance |
| Difficile | Minimax + table transposition + move ordering, profondeur 8 | Tres fort |

### En ligne

WebSocket vers Railway. Horloge toujours active (filet de securite 35s cote serveur).

PUBLIC : matchmaking automatique
PRIVE : code 4 lettres — creer / rejoindre / partager. Les parametres (auto-completion, tournoi) sont partages du createur au rejoignant.

Abandon : bouton maison en cours de partie → confirmation QUITTER → envoie abandon au serveur → l'adversaire recoit victoire immediate avec option JOUER EN LIGNE.

---

## 7. Système de progression

### Rangs (score sur 5000 pts)

| Rang | Seuil |
|------|-------|
| Recrue | 0 |
| Apprenti | 500 |
| Combattant | 1000 |
| Veteran | 1500 |
| Expert | 2000 |
| Maitre | 3000 |
| Grand Maitre | 4000 |
| Legende | 5000 |

### Points de jeu

| Action | Points |
|--------|--------|
| Victoire en ligne | +30 pts |
| Victoire Bot Difficile | +20 pts |
| Victoire Bot Moyen | +10 pts |
| Victoire Bot Facile | +5 pts |
| Victoire < 20 coups | +10 pts bonus |
| Streak x1.2 (3+) / x1.5 (5+) | multiplicateur |
| Meilleur streak 3/5/10/20 | +30/75/150/300 pts |
| Egalite | +3 pts |
| Defaite | -10 pts (protege sous 150 pts) |
| Defis completes | pts variables |

---

## 8. Défis et quêtes

### 8.1 Defis permanents (57 defis)

Points ajoutes automatiquement a la completion. Popup fermable (auto-fermeture 8s). Point rouge sur DEFIS si non vus.

Categories : Premiers pas (3), Bot (7), Tournoi (4), Streak (5), Style (11), Assiduite (8), Insolite (19).
+ 10 grands defis de fin de parcours.

### 8.2 Defis journaliers (3 tires par jour parmi 15)

Renouveles a minuit. Badge JOUR dans l'ecran DEFIS.

Exemples : gagner 1/3/5 parties, jouer 3/5/10 parties, battre le bot, victoire en ligne, tournoi du jour...

### 8.3 Quetes hebdomadaires (3 tirees chaque lundi parmi 10)

Renouvelees chaque lundi. Badge SEMAINE et compte a rebours dans l'ecran DEFIS.

Exemples : gagner 10 parties, 5 victoires en ligne, 3 victoires vs bot difficile, enchaîner 5 victoires, jouer 20 parties, 2 tournois, roi de la semaine (10 victoires en ligne, 150 pts)...

### 8.4 Historique des parties

Menu profil (3 points) → Historique. 20 dernieres parties avec resultat, mode, adversaire, coups, delta pts, temps ecoule.

---

## 9. Fonctionnalités détaillées

### 9.1 Authentification

Inscription (pseudo, email, mdp, avatar 24 choix), connexion (email + mdp, oeil, email memorise), JWT 30 jours, reset par email Brevo 15 min, changer avatar/pseudo, supprimer compte.

### 9.2 Interface en jeu

- Maison haut gauche : retour menu (confirmation si partie, abandon si en ligne)
- Ampoule haut gauche : indice (3/manche, surbrillance meilleur coup)
- 3 points haut droite : regles, son, theme, abandon online
- Fleche bas droite : annuler coup (bot uniquement)
- REJOUER : nouvelle manche
- Chat bas : visible uniquement en jeu online

### 9.3 Grille de jeu

SVG overlay : cellules transparentes, lignes SVG par-dessus (0.3px entre cellules, 0.7px entre sous-grilles). Sous-grille active : encadrement dore pulsant. Hover cellule : fond dore.

### 9.4 Timer circulaire

Cercle SVG autour de l'avatar du joueur actif. Couleur vert → jaune → rouge. Timeout 35s cote serveur (online), configurable 15s/30s/60s en local/bot.

### 9.5 Scoreboard

Deux avatars cote a cote, nom, rang, score. Avatars partages entre joueurs online. Attente auth_ok avant create_room/join_room/matchmake.

### 9.6 Fond immersif

18 particules ambiantes, scanlines animees, halo pulsant — couleurs adaptees au theme actif.

### 9.7 Mode Tournoi

Best-of-5 (premier a 3 manches). Stats enregistrees par manche.

### 9.8 Analyse de partie

Replay coup par coup depuis l'ecran gameover → bouton ANALYSER.

### 9.9 Easter egg

3 clics rapides sur ULTIMATE TTT → mot de passe Antoine → +3 indices. 3 echecs → ferme la page.

---

## 10. Architecture technique

### 10.1 Backend (server.js)

Node.js natif (sans Express) + ws + pg + bcryptjs + jsonwebtoken + nodemailer.

Routes HTTP : GET / (index.html), POST /auth/register, POST /auth/login, GET /auth/me, PUT /auth/profile, PUT /auth/stats, POST /auth/forgot, POST /auth/reset, DELETE /auth/account.

Messages WS client → serveur : auth, create_room, join_room, matchmake, cancel_matchmake, move, reset, automode, chat, abandon.

Messages WS serveur → client : auth_ok, role, roomId, state, names, automode, waiting, ready, matched, chat, abandon.

### 10.2 Base de donnees PostgreSQL

Table users (id, pseudo, email, password_hash, avatar, stats JSONB, reset_token, reset_expires, created_at). Stats en JSONB, survivent aux redeploiements.

### 10.3 Algorithme IA

Minimax avec elagage alpha-beta, table de transposition, move ordering, deepening iteratif profondeur 8, timeout 5s max.

### 10.4 Audio

Web Audio API synthetisee (zero fichier audio). Sons : deplacement, sous-grille gagnee, victoire tournoi, erreur, compte a rebours urgent.

---

## 11. Thèmes visuels (18 thèmes)

cyberpunk, mario, jungle, princess, ocean, japon, arctique, montagne, labo, enfer, espace, candy (Synthwave), western (Storm), cafe (Glace), halloween, hawaii, theatre, rouille.

---

## 12. Dépannage

| Symptome | Solution |
|----------|----------|
| ECONNREFUSED 5432 | Verifier DATABASE_URL Railway + redeployer |
| Mail non recu | Verifier expediteur Brevo + cle API xkeysib-... |
| Avatars adversaire incorrects | Resolu : attente auth_ok avant commandes WS |
| Popups defis au login | Resolu : mode silencieux au login |
| Son persistant apres menu | Resolu : audioCtx.suspend() + verification mode |
| Ecran waiting apres abandon | Resolu : ws.onmessage = null immediat |
| git push refuse | git pull && git push |
| Serverless actif | Desactiver dans Settings Railway |

---

Developpe par Antoine Dehoux sur Android/Termux
HTML · CSS · JavaScript · Node.js · WebSocket · PostgreSQL · JWT · Brevo · Railway
