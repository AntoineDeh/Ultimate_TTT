"""
train_model.py
Entraîne un réseau de neurones sur les données générées,
puis exporte dans model/ au format TensorFlow.js.

Usage:
    pip install numpy tensorflow tensorflowjs
    python train_model.py

Sortie: model/model.json + model/group1-shard1of1.bin
"""

import numpy as np
import os
import sys

# ── Chargement des données ────────────────────────────────────────────────────
if not os.path.exists('training_data.npz'):
    print("❌ training_data.npz introuvable.")
    print("   Lance d'abord : python generate_data.py")
    sys.exit(1)

print("📂 Chargement des données...")
data = np.load('training_data.npz')
X, y = data['X'], data['y']
print(f"   {len(X)} exemples, {X.shape[1]} features")

# ── Import TensorFlow ─────────────────────────────────────────────────────────
try:
    import tensorflow as tf
    from tensorflow import keras
    print(f"   TensorFlow {tf.__version__}")
except ImportError:
    print("❌ TensorFlow non installé. Lance : pip install tensorflow")
    sys.exit(1)

# ── Architecture ──────────────────────────────────────────────────────────────
model = keras.Sequential([
    keras.layers.Input(shape=(X.shape[1],)),
    keras.layers.Dense(256, activation='relu'),
    keras.layers.BatchNormalization(),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.BatchNormalization(),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(1, activation='tanh')
], name='ultimate_ttt')

model.summary()

# ── Entraînement ──────────────────────────────────────────────────────────────
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

split = int(len(X) * 0.9)
X_train, X_val = X[:split], X[split:]
y_train, y_val = y[:split], y[split:]

callbacks = [
    keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, verbose=1),
    keras.callbacks.ReduceLROnPlateau(patience=3, factor=0.5, verbose=1),
]

print("\n🚀 Entraînement...")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=50,
    batch_size=256,
    callbacks=callbacks,
    verbose=1
)

loss, mae = model.evaluate(X_val, y_val, verbose=0)
print(f"\n📊 Val loss={loss:.4f} | MAE={mae:.4f}")

# ── Export TensorFlow.js ──────────────────────────────────────────────────────
os.makedirs('model', exist_ok=True)

try:
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, 'model')
    print("\n✅ Modèle exporté dans model/")
    print("   model/model.json")
    print("   model/group1-shard1of1.bin")
except ImportError:
    # Fallback : sauvegarder en SavedModel puis convertir
    model.save('model_saved')
    print("\n⚠️  tensorflowjs non installé.")
    print("   Installe-le : pip install tensorflowjs")
    print("   Puis convertis manuellement :")
    print("   tensorflowjs_converter --input_format tf_saved_model model_saved model/")
    sys.exit(1)

print("\n🎉 Terminé ! Prochaine étape :")
print("   git add model/")
print('   git commit -m "feat: add trained AI model"')
print("   git push")
