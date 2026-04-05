# 🧠 Entraîner l'IA — Google Colab

## Prérequis
- Un compte Google (Gmail suffit)
- Le fichier `Ultimate_TTT_Training.ipynb`

## Étapes

### 1. Ouvrir le notebook
- Va sur [colab.research.google.com](https://colab.research.google.com)
- **Fichier** → **Importer un notebook** → sélectionne `Ultimate_TTT_Training.ipynb`

### 2. Activer le GPU (important pour la vitesse)
- **Exécution** → **Modifier le type d'exécution** → **GPU T4** → Enregistrer

### 3. Exécuter les cellules dans l'ordre
Clique sur ▶ pour chaque cellule, ou **Exécution** → **Tout exécuter**

| Cellule | Description | Durée |
|---------|-------------|-------|
| 1 | Installer tensorflowjs | ~1 min |
| 2 | Logique du jeu | immédiat |
| 3 | Minimax + évaluation | immédiat |
| 4 | Générer les données | ~15 min |
| 5 | Entraîner le modèle | ~5 min |
| 6 | Exporter + télécharger | immédiat |

### 4. Récupérer le modèle
La cellule 6 télécharge automatiquement **`model.zip`** dans tes téléchargements.

### 5. Mettre dans le repo
Dézippe `model.zip`, copie les fichiers dans le dossier `model/` du repo, puis :
```bash
cd ~/Ultimate_TTT_fix
git add model/
git commit -m "feat: trained AI model"
git push
```

### 6. Vérifier
Ouvre le jeu sur GitHub Pages et dans la console du navigateur tu dois voir :
```
✅ Modèle IA chargé
```

## Notes
- Garde l'écran allumé pendant l'entraînement
- Si la session expire, relance depuis la cellule 4
- Le fichier `training_data.npz` est sauvegardé dans Colab, pas besoin de regénérer si tu ré-entraînes dans la même session
