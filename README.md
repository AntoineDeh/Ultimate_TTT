# 🎮 Ultimate Tic-Tac-Toe

Un jeu de morpion ultime (9×9) jouable en local, contre un bot ou en réseau — depuis un téléphone Android via Termux.

---

## 📁 Fichiers

```
ultimate_ttt/
├── index.html   # Le jeu complet (front-end)
└── server.js    # Serveur Node.js (multijoueur en ligne)
```

---

## 🕹️ Modes de jeu

| Mode | Description |
|------|-------------|
| **Local** | 2 joueurs sur le même appareil, à tour de rôle |
| **Contre le bot** | Solo contre l'IA (Facile / Moyen / Difficile) |
| **En ligne** | 2 joueurs via WiFi local ou internet (nécessite le serveur) |

---

## 🚀 Lancer le jeu

### Mode local / bot — sans serveur

Ouvre simplement `index.html` dans un navigateur. Aucune installation requise.

### Mode en ligne — avec serveur

#### Prérequis (une seule fois)

```bash
pkg install nodejs
npm install ws
```

#### Lancer

**Terminal 1 — le serveur :**
```bash
ttt-server
```

**Terminal 2 — le tunnel (pour jouer à distance) :**
```bash
ttt-tunnel
```

Le tunnel affiche une URL publique de type :
```
https://xxxx-xxxx.trycloudflare.com
```

Envoie cette URL à ton ami. Toi tu ouvres `http://localhost:3000`.

---

## ⚙️ Configuration des alias (Termux)

Ajoute ces lignes dans `~/.bashrc` :

```bash
alias ttt-server='cd ~/storage/shared/Git/ultimate_ttt && node server.js'
alias ttt-tunnel='cloudflared tunnel --url http://localhost:3000'
```

Puis recharge :
```bash
source ~/.bashrc
```

#### Installer cloudflared (une seule fois)

```bash
pkg install cloudflared
```

---

## 📡 Connexions

| Situation | URL à utiliser |
|-----------|----------------|
| Même appareil | `http://localhost:3000` |
| Même WiFi | `http://192.168.x.x:3000` (affiché au démarrage du serveur) |
| Internet (tunnel) | URL `trycloudflare.com` affichée par `ttt-tunnel` |

> ⚠️ L'URL du tunnel change à chaque redémarrage de `ttt-tunnel`. Renvoie-la à ton ami si tu relances.

---

## 🎯 Règles du jeu

Le plateau est une **grille 3×3 de sous-grilles**, chacune étant un morpion 3×3 classique.

- La case jouée **détermine la sous-grille** où l'adversaire doit jouer au coup suivant.
- Si la sous-grille imposée est **déjà gagnée ou pleine**, le joueur peut jouer n'importe où.
- Gagner une sous-grille = aligner 3 symboles dedans.
- Gagner la partie = aligner **3 sous-grilles gagnées** en ligne, colonne ou diagonale.

---

## 🤖 Niveaux du bot

| Niveau | Comportement |
|--------|-------------|
| **Facile** | Coups aléatoires |
| **Moyen** | Tente de gagner/bloquer les sous-grilles |
| **Difficile** | Minimax avec élagage alpha-bêta, profondeur itérative (max ~5s) |

---

## 🎛️ Fonctionnalités

- **Pseudos** personnalisés pour chaque joueur
- **Score** persistant entre les manches
- **Abandon** avec point attribué à l'adversaire
- **Annuler** le dernier coup (mode bot uniquement)
- **Auto-complétion** désactivable via ⚙️ : si un coup gagne la sous-grille, il est joué automatiquement (ou surligné en jaune si désactivé)
- **Règles** accessibles via le bouton **i** en jeu
- **Retour au menu** via le bouton **⌂** sans perdre le score de session

---

## 📱 Compatibilité

Optimisé pour mobile (Android, Termux). Fonctionne aussi sur desktop dans n'importe quel navigateur moderne.
