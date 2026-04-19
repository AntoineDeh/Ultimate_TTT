# 🎮 Ultimate Tic-Tac-Toe

Un jeu de morpion ultime (9×9) jouable en **local**, **contre un bot** ou **en réseau** — conçu pour mobile Android depuis Termux, accessible depuis n'importe quel navigateur moderne.

🌐 **Jouer en ligne** : https://ultimatettt-production.up.railway.app

---

## 📱 Installation complète sur Android (débutant)

> Suis ces étapes dans l'ordre. À faire **une seule fois**.

### Étape 1 — Installer Termux

1. Ouvre le **Play Store** (ou F-Droid)
2. Cherche **Termux** et installe-le
3. Ouvre Termux — tu verras un terminal noir avec un curseur

### Étape 2 — Autoriser l'accès au stockage

```bash
termux-setup-storage
```

Une fenêtre s'ouvre → appuie sur **Autoriser**.

### Étape 3 — Installer Node.js

```bash
pkg update && pkg upgrade -y
pkg install nodejs -y
```

> ⏳ Ça peut prendre 2-3 minutes.

### Étape 4 — Créer le dossier du jeu

```bash
mkdir -p ~/Ultimate_TTT_fix
cd ~/Ultimate_TTT_fix && npm install ws
```

### Étape 5 — Configurer les alias (raccourcis)

```bash
nano ~/.bashrc
```

Ajoute ces lignes à la fin :

```bash
# === Ultimate TTT ===
alias ttt-server='cd ~/Ultimate_TTT_fix && node server.js'
alias ttt-tunnel='cloudflared tunnel --url http://localhost:3000'
alias ttt-update='cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && echo "Jeu mis à jour !"'
alias ttt-update-server='cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/ && echo "Serveur mis à jour !"'
```

Sauvegarde : **Ctrl+X** → **Y** → **Entrée**, puis :

```bash
source ~/.bashrc
```

### Étape 6 — Copier les fichiers du jeu

Télécharge `index.html` et `server.js`, puis :

```bash
cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/
cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/
```

✅ **Installation terminée !**

---

## 🚀 Lancer le jeu

### Jouer seul ou contre le bot (sans serveur)

Ouvre `index.html` directement dans Chrome — aucun serveur nécessaire.

### Jouer via le serveur Railway (recommandé)

Ouvre directement dans Chrome :
```
https://ultimatettt-production.up.railway.app
```

Partage ce lien à tes amis — aucune installation requise de leur côté.

### Lancer le serveur local (WiFi)

```bash
ttt-server
```

Affiche l'IP réseau locale à partager à ton ami (même WiFi).

### Tunnel internet (pour jouer à distance sans Railway)

```bash
# Installer cloudflared (une seule fois)
pkg install cloudflared -y

# Terminal 1
ttt-server

# Terminal 2
ttt-tunnel
```

L'URL `trycloudflare.com` affichée change à chaque redémarrage.

---

## 📡 URLs de connexion

| Situation | URL |
|-----------|-----|
| Serveur cloud (recommandé) | `https://ultimatettt-production.up.railway.app` |
| Même appareil (local) | `http://localhost:3000` |
| Même WiFi | IP affichée au démarrage du serveur |
| Internet (tunnel) | URL `trycloudflare.com` |

---

## 🕹️ Modes de jeu

### ◈ Local — 2 joueurs
Deux joueurs sur le même appareil, à tour de rôle. Pseudos personnalisés.
**Pas de stats ni de points** — mode libre sans conséquences.

### ◆ Contre le Bot
Solo contre l'IA. Trois niveaux :

| Niveau | Comportement |
|--------|-------------|
| 🟢 **Facile** | Joue correctement 70% du temps, fait des gaffes 30% |
| 🟡 **Moyen** | Minimax profondeur 3 — voit 3 coups à l'avance |
| 🔴 **Difficile** | Minimax alpha-bêta, profondeur itérative jusqu'à 8 |

### ◉ En ligne — Réseau
Deux modes disponibles :

**🌐 PUBLIC — Matchmaking automatique**
- Recherche un adversaire disponible avec le **même réglage auto-complétion**
- La partie démarre automatiquement dès qu'un adversaire est trouvé

**🔒 PRIVÉ — Room avec code**
- **Créer une room** → un code à 4 lettres est généré (ex: `KXBT`)
- Partage le code via 📋 COPIER ou 📤 PARTAGER (WhatsApp, SMS...)
- L'ami entre le code et rejoint directement
- Le créateur choisit le réglage auto-complétion (imposé aux deux)

---

## 🎯 Règles du jeu

Le plateau est une **grille 3×3 de sous-grilles**, chacune étant un morpion 3×3 classique.

1. La case jouée **détermine la sous-grille** où l'adversaire doit jouer
2. Si cette sous-grille est déjà terminée, le joueur joue **où il veut**
3. Gagner une sous-grille = aligner 3 symboles dedans
4. Gagner la partie = aligner **3 sous-grilles** en ligne, colonne ou diagonale

### ⚡ Auto-complétion
Si activée : un coup gagnant dans la sous-grille active est joué automatiquement.
Si désactivée : les cases gagnantes sont **surlignées en jaune** — tu dois cliquer dessus.

---

## 🎛️ Boutons en jeu

| Bouton | Disponible | Action |
|--------|-----------|--------|
| ⌂ | Tous | Retour au menu |
| i | Tous | Affiche les règles |
| 💡 | Tous | Indice — meilleur coup (3/manche en ligne/local, ∞ vs bot) |
| ↩ | Bot seulement | Annuler le dernier coup (illimité) |
| ↺ REJOUER | Fin de partie | Nouvelle manche (score conservé) |
| ⚑ ABANDON | En jeu | Abandonne — le point va à l'adversaire |
| 🔍 ANALYSER | Fin de partie | Analyse la partie coup par coup |

---

## 🔍 Analyse de partie

Après chaque partie, bouton **ANALYSER** disponible. Compare chaque coup joué au meilleur coup calculé :

| Qualité | Signification |
|---------|--------------|
| ✅ Excellent | Meilleur coup possible |
| 👍 Bon | Très bon coup |
| ⚠️ Imprécis | Coup sous-optimal |
| ❌ Erreur | Mauvais coup |
| 💀 Gaffe | Très mauvais coup |

Navigation ← → pour parcourir. Coup joué en **bleu**, meilleur coup en **vert**.

---

## 🎨 Thèmes — 18 designs

Bouton 🎨 DESIGN dans le menu. Le logo du menu affiche les emojis du thème actif.

| Thème | Emojis | Ambiance |
|-------|--------|----------|
| 🤖 Cyberpunk | X / O | Néon, scanlines animées |
| 🎮 Mario | 🍄 / ⭐ | Ciel bleu, nuages |
| 🌴 Jungle | 🦁 / 🐸 | Forêt sombre |
| 👸 Princesse | 🌸 / 💎 | Nuit violette, étoiles |
| 🌊 Ocean | 🐙 / 🦈 | Abysses bleus |
| 🔥 Enfer | 😈 / 💀 | Lave, braises |
| 🚀 Espace | 👾 / 🛸 | Cosmos, nébuleuse |
| 🍬 Candy | 🍭 / 🍬 | Pastel rose (clair) |
| 🧊 Arctique | 🐻‍❄️ / 🦊 | Aurora borealis |
| 🏯 Japon | ⛩️ / 🌸 | Rouge lacqué |
| 🤠 Western | 🤠 / 💀 | Désert, coucher de soleil |
| 🧪 Labo | ⚗️ / 🧬 | Matrix vert acide |
| 🎃 Halloween | 🎃 / 👻 | Orange/violet sombre |
| 🌺 Hawaii | 🌺 / 🐠 | Coucher de soleil tropical |
| 🏔️ Montagne | 🦅 / 🐺 | Gris ardoise, neige |
| 🎭 Théâtre | 😂 / 😢 | Bordeaux velours, or |
| 🔩 Rouille | 🔩 / ⚙️ | Métal corrodé |
| 🧁 Café | ☕ / 🧁 | Brun chaud (clair) |

---

## 📊 Statistiques & Rang TTT

Accessibles depuis 📊 STATISTIQUES dans le menu. Organisées par mode (Global, Facile, Moyen, Difficile, En ligne). Le mode **Local** n'enregistre pas de stats.

**Données :** Victoires / Défaites / Égalités, taux de victoire, streak actuel 🔥, meilleur streak ⭐, victoire la plus rapide ⚡, partie la plus longue 🏁.

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
| Streak ≥ 3 victoires | ×1.2 |
| Streak ≥ 5 victoires | ×1.5 |
| Meilleur streak ≥ 3 | +30 |
| Meilleur streak ≥ 5 | +80 |
| Meilleur streak ≥ 10 | +150 |
| Égalité | +5 |
| Défaite (si score ≥ 100) | -25 |

> Zone protégée : pas de malus défaite tant que le score est sous 100 pts.

Clique sur le badge de rang dans le menu pour voir le détail complet.

---

## 🔐 Easter egg

3 clics rapides sur **ULTIMATE TTT** → popup → `Antoine` → **+3 indices** 🔑

---

## 🖥️ Serveur Railway

Le jeu tourne sur Railway.app en continu.

| Plan | Prix | Capacité estimée |
|------|------|-----------------|
| Trial | Gratuit 30j ($5 crédits) | ~200 joueurs simultanés |
| Hobby | 5$/mois | ~200-500 joueurs |
| Pro | 20$/mois | Des milliers |

Chaque `git push` redéploie automatiquement.

---

## 📁 Structure des fichiers

```
Ultimate_TTT_fix/
├── index.html          # Jeu complet (interface)
├── server.js           # Serveur multijoueur (rooms + matchmaking)
├── package.json        # Config Node.js
├── nixpacks.toml       # Config déploiement Railway
├── README.md           # Ce fichier
└── node_modules/       # Dépendances (auto)
```

---

## 🔧 Commandes utiles

```bash
# Mettre à jour le jeu
ttt-update

# Mettre à jour le serveur
ttt-update-server

# Copier les deux fichiers d'un coup
cp ~/storage/downloads/index.html ~/Ultimate_TTT_fix/ && cp ~/storage/downloads/server.js ~/Ultimate_TTT_fix/

# Pousser sur GitHub (redéploie Railway automatiquement)
cd ~/Ultimate_TTT_fix && git add -A && git commit -m "update" && git push

# Forcer un redéploiement Railway sans changement
cd ~/Ultimate_TTT_fix && git commit --allow-empty -m "force redeploy" && git push

# Lancer le serveur local
ttt-server
```

---

## 🆘 Problèmes fréquents

| Problème | Solution |
|----------|----------|
| Boutons ne répondent pas | Vide le cache Chrome après update |
| `ttt-server` introuvable | `source ~/.bashrc` |
| `Cannot find module 'ws'` | `cd ~/Ultimate_TTT_fix && npm install ws` |
| Railway : deployment failed | Vérifier `package.json` et `nixpacks.toml` |
| Code room invalide | Le code est sensible à la casse — 4 lettres majuscules |
| L'URL Railway change | Elle ne change pas — `ultimatettt-production.up.railway.app` est permanente |

---

## 📱 Compatibilité

- Optimisé **mobile Android** (Chrome)
- Fonctionne sur tout navigateur moderne (iOS, desktop)
- Responsive — s'adapte à toutes tailles d'écran
- Données sauvegardées en localStorage (thème, stats, rang)

---

*Développé par Antoine Dehoux — projet personnel sur Android/Termux*
