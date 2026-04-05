# 🧠 Entraîner l'IA — Ultimate TTT

Ce dossier contient les scripts pour entraîner un réseau de neurones qui améliore
la vitesse d'analyse et la qualité des indices dans le jeu.

---

## 📋 Prérequis

Python 3.8+ et pip installés. Puis :

```bash
pip install numpy tensorflow tensorflowjs
```

> Sur Windows : utilise PowerShell ou cmd.
> Sur Mac/Linux : utilise le terminal.
> Si `pip` ne fonctionne pas, essaie `pip3`.

---

## 🚀 Procédure complète

### Étape 1 — Générer les données d'entraînement

```bash
python generate_data.py
```

**Durée : ~30 minutes**

Ce script joue 10 000 parties aléatoires et labellise chaque position
avec un score minimax (profondeur 4). Il produit le fichier :

```
training_data.npz   ← ~50 000 exemples
```

Tu verras la progression :
```
Génération de 10000 parties...
  0/10000 parties...
  500/10000 parties...
  ...
✅ Dataset : 49832 exemples, 281 features
💾 Sauvegardé dans training_data.npz
```

---

### Étape 2 — Entraîner le modèle

```bash
python train_model.py
```

**Durée : ~5-10 minutes**

Ce script charge `training_data.npz`, entraîne le réseau de neurones,
puis exporte le modèle dans le dossier `model/` :

```
model/
├── model.json              ← architecture + métadonnées
└── group1-shard1of1.bin    ← poids du réseau
```

Tu verras la progression epoch par epoch :
```
Epoch 1/50 — loss: 0.1842 — val_loss: 0.1654
Epoch 2/50 — loss: 0.1423 — val_loss: 0.1301
...
✅ Modèle exporté dans model/
```

---

### Étape 3 — Mettre le modèle dans le repo

Vérifie que ton dossier ressemble à ça :

```
Ultimate_TTT/
├── index.html
├── server.js
├── generate_data.py
├── train_model.py
├── TRAIN_README.md
├── training_data.npz       ← généré à l'étape 1
└── model/                  ← généré à l'étape 2
    ├── model.json
    └── group1-shard1of1.bin
```

Puis push sur GitHub :

```bash
git add model/
git commit -m "feat: add trained AI model"
git push
```

---

### Étape 4 — Vérifier que ça fonctionne

Ouvre le jeu sur GitHub Pages :
```
https://antoinedeh.github.io/Ultimate_TTT/
```

Ouvre la console du navigateur (F12 → Console).
Si le modèle est bien chargé, tu verras :
```
✅ Modèle IA chargé
```

Sinon tu verras :
```
⚠️ Modèle IA non disponible, minimax utilisé
```
→ Vérifie que `model/model.json` est bien pushé sur GitHub.

---

## 🧬 Architecture du réseau

```
Input (281)  →  Dense 256 (ReLU)  →  Dense 128 (ReLU)  →  Dense 64 (ReLU)  →  Output 1 (tanh)
```

**Entrée — 281 features :**
| Groupe | Taille | Description |
|--------|--------|-------------|
| Cases | 243 | 9×9 cases × 3 one-hot (X / O / vide) |
| Sous-grilles | 27 | 9 sous-grilles × 3 one-hot (X / O / libre) |
| Grille active | 10 | 9 one-hot + 1 bit "aucune grille imposée" |
| Joueur | 1 | 1 si c'est à O de jouer, 0 sinon |

**Sortie :** valeur entre **-1** (X domine) et **+1** (O domine)

---

## ⚡ Impact sur le jeu

Sans modèle → `evalState()` calcule manuellement menaces/positions.
Avec modèle → le réseau prédit instantanément, ce qui permet au minimax
d'explorer **2-3 niveaux plus profonds** dans le même temps.

Concrètement :
- **Indices** : meilleure qualité, calcul plus rapide
- **Analyse de partie** : barre de progression 2-3× plus rapide
- **Bot difficile** : plus fort en début de partie

---

## 🔄 Ré-entraîner

Pour améliorer le modèle, relance les deux scripts.
Plus tu génères de parties (`N_GAMES` dans `generate_data.py`), meilleur sera le modèle.
