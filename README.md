# 🎮 Ultimate Tic-Tac-Toe

> Compte rendu de projet — Développement d'un jeu web multijoueur déployé sur le cloud

**Auteur** : Antoine Dehoux  
**Stack** : HTML / CSS / JavaScript / Node.js / WebSocket / Railway  
**Repo GitHub** : https://github.com/AntoineDeh/Ultimate_TTT  
**URL de production** : https://ultimatettt-production.up.railway.app  

---

## 📋 Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Mise en place de l'environnement](#2-mise-en-place-de-lenvironnement)
3. [Déploiement sur Railway](#3-déploiement-sur-railway)
4. [Règles du jeu](#4-règles-du-jeu)
5. [Modes de jeu](#5-modes-de-jeu)
6. [Fonctionnalités développées](#6-fonctionnalités-développées)
7. [Architecture technique](#7-architecture-technique)
8. [Dépannage](#8-dépannage)

---

## 1. Présentation du projet

Ultimate Tic-Tac-Toe est une version avancée du morpion classique. Le plateau est une grille de 9×9 cases organisée en 9 sous-grilles de 3×3. Le jeu a été développé entièrement en JavaScript vanilla (sans framework), optimisé pour mobile Android, et déployé sur un serveur cloud accessible mondialement.

### Fonctionnalités principales

- 3 modes de jeu : local 2 joueurs, contre une IA (3 niveaux), multijoueur en ligne
- Multijoueur en ligne : rooms privées avec code + matchmaking automatique
- IA avec algorithme minimax alpha-bêta (profondeur jusqu'à 8)
- 18 thèmes visuels animés avec emojis dynamiques
- Système de statistiques et de rang (0 à 1000 points)
- Analyse de partie coup par coup avec évaluation de qualité

### Fichiers du projet

```
Ultimate_TTT/
├── index.html       # Jeu complet — HTML + CSS + JavaScript en un seul fichier
├── server.js        # Serveur Node.js — WebSocket, rooms, matchmaking
├── package.json     # Configuration Node.js et dépendances
├── nixpacks.toml    # Configuration de build pour Railway
└── README.md        # Ce fichier
```

---

## 2. Mise en place de l'environnement

Le développement a été réalisé sur **Android via Termux** — un émulateur de terminal Linux pour Android. Le jeu étant en production sur Railway, Termux n'est nécessaire que pour modifier le code et pousser les changements sur GitHub.

### 2.1 Installer Termux

1. Installer **Termux** depuis le Play Store ou F-Droid
2. Ouvrir Termux
3. Autoriser l'accès au stockage :

```bash
termux-setup-storage
# → Appuyer sur "Autoriser" dans la popup Android
```

### 2.2 Installer les dépendances système

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
```

### 2.3 Cloner le projet

```bash
git clone https://github.com/AntoineDeh/Ultimate_TTT.git ~/Ultimate_TTT_fix
cd ~/Ultimate_TTT_fix
npm install
```

`npm install` télécharge la dépendance `ws` (WebSocket) listée dans `package.json`.

### 2.4 Configurer Git

```bash
git config --global user.email "email@example.com"
git config --global user.name "Prénom Nom"
git config pull.rebase false
```

### 2.5 Configurer les alias Termux (optionnel mais recommandé)

Ces raccourcis évitent de retaper les mêmes commandes à chaque fois.

```bash
nano ~/.bashrc
```

Ajouter à la fin du fichier :

```bash
# === Ultimate TTT ===
alias ttt-update='cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && echo "Jeu mis à jour !"'
alias ttt-update-server='cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/ && echo "Serveur mis à jour !"'
```

Sauvegarder : **Ctrl+X** → **Y** → **Entrée**, puis :

```bash
source ~/.bashrc
```

### 2.6 Workflow de développement

Le cycle de développement utilisé tout au long du projet :

```
1. Modifier index.html ou server.js (généré par Claude ou édité manuellement)
2. Copier le fichier dans le dossier projet :
      ttt-update          (pour index.html)
      ttt-update-server   (pour server.js)
3. Pousser sur GitHub :
      cd ~/Ultimate_TTT_fix
      git add -A
      git commit -m "description du changement"
      git push
4. Railway redéploie automatiquement en ~1 minute
```

---

## 3. Déploiement sur Railway

Railway est une plateforme cloud qui héberge le serveur Node.js. Chaque `git push` sur GitHub déclenche automatiquement un redéploiement. L'URL de production est permanente et accessible sans laisser de serveur local allumé.

### 3.1 Tarifs Railway

| Plan | Prix | RAM | Capacité estimée |
|------|------|-----|-----------------|
| Trial | Gratuit 30 jours ($5 crédits) | 1 Go | ~200 joueurs simultanés |
| Hobby | 5 $/mois | 1 Go | ~200–500 joueurs simultanés |
| Pro | 20 $/mois | jusqu'à 1 To | Des milliers de joueurs |

Pour un usage personnel jusqu'à quelques centaines de joueurs, le plan **Hobby à 5$/mois** est suffisant.

### 3.2 Créer un compte Railway

1. Aller sur **https://railway.app**
2. Cliquer **Login** → **Login with GitHub**
3. Autoriser Railway à accéder au compte GitHub

### 3.3 Créer le projet

1. Cliquer **New Project**
2. Sélectionner **Deploy from GitHub repo**
3. Choisir le repo **AntoineDeh/Ultimate_TTT**
4. Railway détecte automatiquement Node.js

### 3.4 Fichiers de configuration requis

Ces deux fichiers doivent être présents à la racine du repo.

**package.json** — indique à Railway comment démarrer le serveur :

```json
{
  "name": "ultimate-ttt",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "ws": "^8.20.0" }
}
```

**nixpacks.toml** — définit les étapes de build :

```toml
[phases.install]
cmds = ["npm install"]

[start]
cmd = "node server.js"
```

> Sans `nixpacks.toml`, Railway peut échouer avec l'erreur `Error creating build plan with Railpack`.

### 3.5 Paramètres du service

Dans l'onglet **Settings** du service Railway :

- **Custom Start Command** : `node server.js`
- **Serverless** : **désactivé** — un serveur WebSocket doit rester actif en permanence. Si Serverless est activé, le conteneur s'éteint entre les requêtes et coupe les connexions WebSocket.

### 3.6 Générer le domaine public

1. Onglet **Settings** → section **Networking** → **Public Networking**
2. Cliquer **Generate Domain**
3. L'URL générée est permanente : `https://ultimatettt-production.up.railway.app`

### 3.7 Vérifier le déploiement

L'onglet **Deployments** affiche **ACTIVE** et **Deployment successful** quand le serveur tourne correctement. Ouvrir l'URL dans Chrome confirme que le jeu est accessible.

### 3.8 Mettre à jour le serveur en production

Toute modification poussée sur GitHub déclenche un redéploiement automatique. Pour forcer un redéploiement sans modification de code :

```bash
cd ~/Ultimate_TTT_fix
git commit --allow-empty -m "force redeploy"
git push
```

---

## 4. Règles du jeu

### 4.1 Concept général

Le plateau est une **grille 3×3 de sous-grilles**, chacune étant un morpion 3×3 classique. On joue donc sur une grille de 9×9 cases au total.

```
┌─────────┬─────────┬─────────┐
│  X · ·  │  · · ·  │  · · O  │
│  · O ·  │  X · ·  │  · · ·  │  ← grille globale 3×3
│  · · ·  │  · · O  │  X · ·  │    (chaque bloc = une sous-grille)
├─────────┼─────────┼─────────┤
│  · · ·  │  O · ·  │  · · ·  │
│  · X ·  │  · X ·  │  · O ·  │
│  · · O  │  · · ·  │  · · X  │
├─────────┼─────────┼─────────┤
│  · · ·  │  · · ·  │  · · ·  │
│  X · ·  │  · · X  │  O · ·  │
│  · · ·  │  · O ·  │  · · ·  │
└─────────┴─────────┴─────────┘
```

### 4.2 Déroulement d'un tour

**Règle 1 — Le coup joué détermine où l'adversaire doit jouer**

Quand un joueur pose son symbole dans la **case numéro C** d'une sous-grille, l'adversaire doit obligatoirement jouer dans la **sous-grille numéro C**. Les cases et sous-grilles sont numérotées de 0 à 8, de gauche à droite et de haut en bas.

```
Numérotation des cases/sous-grilles :

  0 │ 1 │ 2
  ──┼───┼──
  3 │ 4 │ 5
  ──┼───┼──
  6 │ 7 │ 8
```

**Exemple** : X joue dans la case 5 (droite du milieu) d'une sous-grille → O doit jouer dans la sous-grille 5.

**Règle 2 — Sous-grille terminée = liberté de choix**

Si la sous-grille imposée est déjà gagnée ou pleine (match nul), le joueur peut jouer dans **n'importe quelle sous-grille encore active**.

**Règle 3 — Gagner une sous-grille**

Aligner 3 symboles identiques dans une sous-grille (ligne, colonne ou diagonale). La sous-grille est alors remportée et affiche le symbole du gagnant.

**Règle 4 — Gagner la partie**

Aligner **3 sous-grilles remportées** sur la grille globale (ligne, colonne ou diagonale). Si toutes les sous-grilles sont terminées sans qu'un joueur ait aligné 3 sous-grilles, la partie est nulle.

### 4.3 Option auto-complétion

- **Activée** : si un coup dans la sous-grille active la fait gagner, il est joué automatiquement
- **Désactivée** (défaut) : les cases gagnantes sont surlignées en jaune — le joueur doit cliquer

---

## 5. Modes de jeu

### ◈ Local — 2 joueurs

Deux joueurs s'affrontent sur le même appareil en se passant le téléphone. Chaque joueur entre son pseudo avant la partie. Aucune statistique ni point n'est enregistré en mode local — il est impossible de savoir qui est quel joueur.

### ◆ Contre le Bot — 3 niveaux

| Niveau | Algorithme | Comportement |
|--------|-----------|-------------|
| 🟢 Facile | Minimax profondeur 1 (70%) + pire coup possible (30%) | Joue correctement mais fait des gaffes intentionnelles. Saisit toujours une victoire immédiate. |
| 🟡 Moyen | Minimax alpha-bêta profondeur 3 | Voit 3 coups à l'avance. Tente de gagner et bloquer les sous-grilles. |
| 🔴 Difficile | Minimax alpha-bêta + table de transposition + move ordering + deepening itératif profondeur 8 | Très fort. Calcule le meilleur coup dans un délai de 5 secondes maximum. |

Stats et points enregistrés pour chaque niveau.

### ◉ En ligne — Multijoueur réseau

Le jeu se connecte au serveur Railway via WebSocket. Deux sous-modes :

**🌐 PUBLIC — Matchmaking automatique**

Le serveur cherche un adversaire disponible ayant le **même réglage auto-complétion**. La partie démarre automatiquement. Si aucun adversaire compatible n'est en attente, le joueur reste dans la file jusqu'à l'arrivée d'un autre joueur.

**🔒 PRIVÉ — Room avec code**

- **Créer** : un code à 4 lettres est généré (ex: `KXBT`). Le créateur le partage via 📋 COPIER ou 📤 PARTAGER (menu natif Android, WhatsApp en fallback).
- **Rejoindre** : entrer le code reçu dans le champ prévu. La connexion se fait immédiatement.
- Le réglage auto-complétion du créateur s'applique aux deux joueurs.

---

## 6. Fonctionnalités développées

### 6.1 Interface et navigation

- Menu principal avec logo animé (grille 3×3 avec emojis du thème actif)
- Badge de rang cliquable — affiche le détail du système de points
- Transitions entre les écrans (setup → attente → jeu → fin de partie)
- Écran d'attente avec affichage du code room et boutons de partage

### 6.2 Boutons en jeu

| Bouton | Modes | Action |
|--------|-------|--------|
| ⌂ | Tous | Retour au menu |
| i | Tous | Règles du jeu |
| 💡 | Tous | Indice (3/manche en ligne et local, illimité vs bot) |
| ↩ | Bot uniquement | Annuler le dernier coup (illimité) |
| ↺ REJOUER | Fin de partie | Nouvelle manche, score conservé |
| ⚑ ABANDON | En cours | Le point va à l'adversaire |
| 🔍 ANALYSER | Fin de partie | Analyse coup par coup |

### 6.3 Analyse de partie

Après chaque partie, l'analyse pré-calcule le meilleur coup pour chaque position et le compare au coup joué :

| Qualité | Signification |
|---------|--------------|
| ✅ Excellent | Meilleur coup possible |
| 👍 Bon | Très bon coup |
| ⚠️ Imprécis | Coup sous-optimal |
| ❌ Erreur | Mauvais coup |
| 💀 Gaffe | Très mauvais coup |

Navigation ← → pour avancer coup par coup. Coup joué en bleu, meilleur coup en vert.

### 6.4 Thèmes — 18 designs

Chaque thème modifie le fond, les couleurs, les animations et les emojis des pièces. Le logo du menu se met à jour automatiquement.

| Thème | Pièce X | Pièce O |
|-------|---------|---------|
| 🤖 Cyberpunk | X | O |
| 🎮 Mario | 🍄 | ⭐ |
| 🌴 Jungle | 🦁 | 🐸 |
| 👸 Princesse | 🌸 | 💎 |
| 🌊 Ocean | 🐙 | 🦈 |
| 🔥 Enfer | 😈 | 💀 |
| 🚀 Espace | 👾 | 🛸 |
| 🍬 Candy | 🍭 | 🍬 |
| 🧊 Arctique | 🐻‍❄️ | 🦊 |
| 🏯 Japon | ⛩️ | 🌸 |
| 🤠 Western | 🤠 | 💀 |
| 🧪 Labo | ⚗️ | 🧬 |
| 🎃 Halloween | 🎃 | 👻 |
| 🌺 Hawaii | 🌺 | 🐠 |
| 🏔️ Montagne | 🦅 | 🐺 |
| 🎭 Théâtre | 😂 | 😢 |
| 🔩 Rouille | 🔩 | ⚙️ |
| 🧁 Café | ☕ | 🧁 |

### 6.5 Statistiques et rang

Les statistiques sont sauvegardées en `localStorage` et organisées par mode de jeu. Le score est recalculé automatiquement depuis les statistiques à chaque retour au menu — il est toujours cohérent.

**Données enregistrées par mode :** victoires / défaites / égalités / taux de victoire / streak actuel / meilleur streak / victoire la plus rapide (en coups) / partie la plus longue (en coups).

**Rangs :**

| Rang | Points |
|------|--------|
| 🥉 Recrue | 0 – 199 |
| 🥈 Challenger | 200 – 399 |
| 🥇 Expert | 400 – 599 |
| 💎 Maître | 600 – 799 |
| 👑 Grand Maître | 800 – 949 |
| 🔥 Légende | 950 – 1000 |

**Gains :** +75 (victoire en ligne), +60 (bot difficile), +35 (bot moyen), +20 (bot facile), +20 (victoire < 20 coups), ×1.2 (streak ≥ 3), ×1.5 (streak ≥ 5), +5 (égalité).  
**Malus :** -25 par défaite si score ≥ 100. Zone protégée sous 100 points — aucun malus.

### 6.6 Easter egg

3 clics rapides sur le titre **ULTIMATE TTT** → popup → mot de passe `Antoine` → +3 indices pour la manche en cours. 3 tentatives échouées ferment la page.

---

## 7. Architecture technique

### 7.1 Frontend (index.html)

Fichier HTML unique contenant l'intégralité du jeu côté client :

- **HTML** : structure des overlays (menu, setup, jeu, stats, règles, design, analyse, gameover, attente)
- **CSS** : 18 thèmes complets avec variables CSS, animations `@keyframes`, responsive mobile-first
- **JavaScript** : logique de jeu, IA minimax, client WebSocket, gestion des stats, rendu DOM

Aucun framework ni bibliothèque externe — JavaScript vanilla pur.

### 7.2 Backend (server.js)

Serveur Node.js avec les responsabilités suivantes :

**Gestion des rooms :**
- Création d'une room avec un code unique à 4 lettres (caractères non ambigus)
- Rejoindre une room par code
- Suppression automatique d'une room quand elle est vide

**Matchmaking :**
- File d'attente par réglage auto-complétion (deux joueurs ne sont appariés que s'ils ont le même réglage)
- Appariement automatique dès que 2 joueurs compatibles sont en attente
- Nettoyage des connexions fermées

**Logique de jeu côté serveur :**
- Validation de chaque coup (respect des règles, tour du bon joueur)
- Calcul du résultat (victoire, nul)
- Diffusion de l'état de la partie aux deux joueurs

**Messages WebSocket (client → serveur) :**

| Message | Description |
|---------|-------------|
| `create_room` | Crée une room privée |
| `join_room` | Rejoint une room par code |
| `matchmake` | Entre dans la file de matchmaking |
| `cancel_matchmake` | Quitte la file |
| `move` | Joue un coup |
| `reset` | Demande une nouvelle manche |
| `name` | Envoie son pseudo |
| `automode` | Envoie le réglage auto-complétion |

**Messages WebSocket (serveur → client) :**

| Message | Description |
|---------|-------------|
| `role` | Indique au joueur s'il est X ou O |
| `roomId` | Code de la room créée |
| `state` | État complet de la partie |
| `names` | Pseudos des deux joueurs |
| `waiting` | L'adversaire s'est déconnecté |
| `ready` | Les deux joueurs sont connectés |
| `matched` | Adversaire trouvé (matchmaking) |
| `matchmaking` | Position dans la file d'attente |
| `error` | Message d'erreur (room introuvable, pleine...) |

### 7.3 Algorithme minimax

L'IA utilise l'algorithme minimax avec élagage alpha-bêta. Le minimax explore l'arbre des coups possibles en alternant entre maximiser le score (bot) et le minimiser (humain).

**Optimisations implémentées :**
- **Alpha-bêta pruning** : élague les branches inutiles, réduit drastiquement le temps de calcul
- **Table de transposition** : mémorise les positions déjà calculées pour éviter les recalculs
- **Move ordering** : trie les coups prometteurs en premier (victoires immédiates, blocages) pour maximiser l'efficacité de l'alpha-bêta
- **Deepening itératif** : augmente la profondeur progressivement jusqu'à la limite de temps (5 secondes)
- **Limite de temps** : arrête le calcul au bout de 5 secondes et retourne le meilleur coup trouvé

**Fonction d'évaluation :**
- +100 points par sous-grille gagnée
- -100 points par sous-grille perdue
- Points intermédiaires pour les menaces (2 symboles alignés sans opposition)

### 7.4 Données persistantes

Toutes les données sont stockées dans le `localStorage` du navigateur :

| Clé | Contenu |
|-----|---------|
| `ttt-theme` | Thème actif |
| `ttt-stats` | Objet JSON contenant toutes les statistiques par mode |

Le score de rang n'est pas stocké — il est recalculé à chaque fois depuis `ttt-stats`.

---

## 8. Dépannage

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Boutons qui ne répondent pas | Ancienne version en cache Chrome | Vider le cache : Chrome → ⋮ → Paramètres → Confidentialité → Effacer les données |
| `git push` refusé | Branches divergentes | `git config pull.rebase false && git pull && git push` |
| Railway : "Error creating build plan" | `nixpacks.toml` ou `package.json` manquant | Vérifier que les deux fichiers sont à la racine du repo |
| Railway : WebSocket déconnecté | Serverless activé | Désactiver Serverless dans Settings du service Railway |
| Code room invalide | Mauvais code ou room expirée | Vérifier 4 lettres majuscules, ou créer une nouvelle room |
| Score à 0 malgré des victoires | Cache localStorage corrompu | Réinitialiser les stats depuis le menu Statistiques |
| `Cannot find module 'ws'` | `npm install` non exécuté | `cd ~/Ultimate_TTT_fix && npm install` |

---

*Projet développé par Antoine Dehoux sur Android/Termux*  
*Stack : HTML · CSS · JavaScript · Node.js · WebSocket · GitHub · Railway.app*
