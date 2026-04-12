# 🎮 Ultimate Tic-Tac-Toe

Un jeu de morpion ultime (9×9) jouable en **local**, **contre un bot** ou **en réseau** — conçu pour mobile Android depuis Termux, jouable dans tout navigateur moderne.

---

## 📁 Structure des fichiers

```
Ultimate_TTT_fix/
├── index.html   # Jeu complet (front-end tout-en-un)
└── server.js    # Serveur Node.js WebSocket (mode en ligne)
```

---

## 🚀 Lancer le jeu

### Mode local / bot — sans serveur

Ouvre `index.html` directement dans un navigateur. Aucune installation requise.

### Mode en ligne — avec serveur

#### Prérequis (une seule fois)

```bash
pkg install nodejs
npm install ws
```

#### Alias Termux recommandés (~/.bashrc)

```bash
alias ttt-server='cd ~/Ultimate_TTT_fix && node server.js'
alias ttt-tunnel='cloudflared tunnel --url http://localhost:3000'
alias ttt-update='mv ~/storage/downloads/index.html ~/Ultimate_TTT_fix/index.html && echo "Fichier déplacé!"'
alias ttt-update-server='mv ~/storage/downloads/server.js ~/Ultimate_TTT_fix/server.js && echo "Server mis à jour!"'
```

Recharge après modification :
```bash
source ~/.bashrc
```

#### Lancer le serveur

```bash
ttt-server
```

Le serveur affiche automatiquement l'IP réseau locale :
```
Local  → http://localhost:3000
Réseau → http://192.168.x.x:3000   ← partager à ton ami (même WiFi)
```

#### Tunnel internet (optionnel, pour jouer à distance)

```bash
# Installer cloudflared (une seule fois)
pkg install cloudflared

# Lancer le tunnel
ttt-tunnel
```

Affiche une URL publique `https://xxxx.trycloudflare.com` — envoie-la à ton ami.

> ⚠️ L'URL change à chaque redémarrage du tunnel.

---

## 📡 URLs de connexion

| Situation | URL |
|-----------|-----|
| Même appareil | `http://localhost:3000` |
| Même WiFi | IP affichée au démarrage du serveur |
| Internet | URL `trycloudflare.com` |

---

## 🕹️ Modes de jeu

### ◈ Local — 2 joueurs
Deux joueurs sur le même appareil, à tour de rôle. Pseudos personnalisés.  
**Pas de stats ni de points enregistrés** — mode libre sans conséquences.

### ◆ Contre le Bot
Solo contre l'IA. Choix de difficulté depuis le menu de configuration.

| Niveau | Comportement |
|--------|-------------|
| 🟢 **Facile** | Joue bien 70% du temps, fait des gaffes 30% du temps |
| 🟡 **Moyen** | Minimax profondeur 3 — voit 3 coups à l'avance |
| 🔴 **Difficile** | Minimax alpha-bêta, profondeur itérative jusqu'à 8 (≤5s) |

### ◉ En ligne — Réseau
Deux joueurs via WebSocket. Nécessite le serveur `server.js`.
- 1er connecté = Joueur X, 2e = Joueur O
- Stats et points enregistrés pour chaque joueur

---

## 🎯 Règles du jeu

Le plateau est une **grille 3×3 de sous-grilles**, chacune étant un morpion 3×3 classique.

1. La case jouée **détermine la sous-grille** où l'adversaire doit jouer au coup suivant
2. Si la sous-grille imposée est **déjà gagnée ou pleine**, le joueur choisit librement
3. Gagner une sous-grille = aligner 3 symboles dedans
4. Gagner la partie = aligner **3 sous-grilles gagnées** (ligne, colonne ou diagonale)

### ⚡ Auto-complétion
Activable dans le menu de setup. Si un coup gagne la sous-grille active, il est joué automatiquement. Sinon les cases gagnantes sont **surlignées en jaune** pour validation manuelle.

---

## 🎛️ Boutons en jeu

| Bouton | Disponible | Action |
|--------|-----------|--------|
| ⌂ | Tous | Retour au menu |
| i | Tous | Affiche les règles |
| 💡 | Tous | Indice — meilleur coup calculé (3/manche en local/ligne, ∞ vs bot) |
| ↩ | Bot seulement | Annuler le dernier coup (illimité) |
| ↺ REJOUER | Bot seulement | Nouvelle manche (score conservé) |
| ⚑ ABANDON | Tous | Abandonne — le point va à l'adversaire |
| 🔍 ANALYSER | Fin de partie | Analyse coup par coup |

---

## 🔍 Analyse de partie

Après chaque partie, bouton **ANALYSER** disponible. Pré-calcule les meilleurs coups et les compare aux coups joués :

| Qualité | Signification |
|---------|--------------|
| ✅ Excellent | Meilleur coup possible |
| 👍 Bon | Très bon coup |
| ⚠️ Imprécis | Coup sous-optimal |
| ❌ Erreur | Mauvais coup |
| 💀 Gaffe | Très mauvais coup |

Navigation ← → pour parcourir la partie. Coup joué en **bleu**, meilleur coup en **vert**.

---

## 🎨 Thèmes — Design

18 thèmes disponibles depuis le bouton 🎨 DESIGN. Le thème est sauvegardé entre les sessions. Le logo du menu affiche les emojis du thème actif.

| Thème | Emojis | Ambiance |
|-------|--------|----------|
| 🤖 Cyberpunk | X / O | Néon, scanlines animées |
| 🎮 Mario | 🍄 / ⭐ | Ciel bleu, nuages, sol herbe |
| 🌴 Jungle | 🦁 / 🐸 | Forêt sombre, vert profond |
| 👸 Princesse | 🌸 / 💎 | Nuit violette, étoiles |
| 🌊 Ocean | 🐙 / 🦈 | Abysses bleus |
| 🔥 Enfer | 😈 / 💀 | Lave, braises rouges |
| 🚀 Espace | 👾 / 🛸 | Cosmos, nébuleuse violette |
| 🍬 Candy | 🍭 / 🍬 | Pastel rose (thème clair) |
| 🧊 Arctique | 🐻‍❄️ / 🦊 | Aurora borealis |
| 🏯 Japon | ⛩️ / 🌸 | Rouge lacqué, cerisiers |
| 🤠 Western | 🤠 / 💀 | Désert, coucher de soleil |
| 🧪 Labo | ⚗️ / 🧬 | Matrix vert acide |
| 🎃 Halloween | 🎃 / 👻 | Orange/violet sombre |
| 🌺 Hawaii | 🌺 / 🐠 | Coucher de soleil tropical |
| 🏔️ Montagne | 🦅 / 🐺 | Gris ardoise, neige |
| 🎭 Théâtre | 😂 / 😢 | Bordeaux velours, or |
| 🔩 Rouille | 🔩 / ⚙️ | Métal corrodé, orange oxydé |
| 🧁 Café | ☕ / 🧁 | Brun chaud (thème clair) |

---

## 📊 Statistiques & Rang TTT

### Statistiques

Accessibles depuis 📊 STATISTIQUES dans le menu. Organisées par mode :
- 🌐 Global · 🟢 Facile · 🟡 Moyen · 🔴 Difficile · ◉ En ligne

Données enregistrées : Victoires / Défaites / Égalités, Taux de victoire, Total parties, Streak actuel 🔥, Meilleur streak ⭐, Victoire la plus rapide ⚡ (coups), Partie la plus longue 🏁 (coups).

> Le mode **Local** n'enregistre pas de stats.

### Rang TTT (score /1000)

Score calculé automatiquement depuis les stats, recalculé à chaque retour au menu.

| Rang | Points |
|------|--------|
| 🥉 Recrue | 0 – 199 |
| 🥈 Challenger | 200 – 399 |
| 🥇 Expert | 400 – 599 |
| 💎 Maître | 600 – 799 |
| 👑 Grand Maître | 800 – 949 |
| 🔥 Légende | 950 – 1000 |

**Gains de points :**

| Action | Points |
|--------|--------|
| Victoire en ligne | +75 |
| Victoire vs Bot Difficile | +60 |
| Victoire vs Bot Moyen | +35 |
| Victoire vs Bot Facile | +20 |
| Victoire en < 20 coups | +20 bonus |
| Streak 3+ victoires | ×1.2 |
| Streak 5+ victoires | ×1.5 |
| Meilleur streak ≥ 3 | +30 |
| Meilleur streak ≥ 5 | +80 |
| Meilleur streak ≥ 10 | +150 |
| Égalité | +5 |
| Défaite (si score ≥ 100) | -25 |

> Zone protégée : pas de malus défaite tant que le score est sous 100 pts.

Cliquer sur le badge de rang ou sur la carte rang dans les stats affiche le détail complet du système de points.

---

## 🔐 Cheat code créateur

3 clics rapides sur le titre **ULTIMATE TTT** ouvrent un popup de code secret.  
Mot de passe : `Antoine` → **+3 indices** pour la manche en cours.  
3 tentatives échouées ferment la page. Tentatives illimitées à 3 essais chacune.

---

## 📱 Compatibilité

- Optimisé **mobile Android** (Termux + Chrome)
- Fonctionne sur tout navigateur moderne (desktop, iOS)
- Interface responsive — s'adapte à toutes tailles d'écran
- Persistance des données : thème, stats et rang sauvegardés en localStorage

---

## 🔧 Commandes utiles

```bash
# Mettre à jour le jeu après téléchargement
ttt-update

# Mettre à jour le serveur après téléchargement
ttt-update-server

# Copier les deux fichiers en une commande
cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/ && echo "Fichiers copiés !"

# Lancer le serveur
ttt-server

# Pousser sur GitHub
cd ~/Ultimate_TTT_fix && git add -A && git commit -m "feat: update" && git push
```

---

*Développé par Antoine Dehoux — projet personnel sur Android/Termux*
