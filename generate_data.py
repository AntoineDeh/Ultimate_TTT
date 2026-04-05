"""
generate_data.py
Génère des données d'entraînement pour le réseau de neurones Ultimate TTT.
Chaque exemple = (état encodé, score minimax)

Usage:
    pip install numpy
    python generate_data.py

Sortie: training_data.npz
"""

import numpy as np
import random
import json
from copy import deepcopy

# ── Constantes ────────────────────────────────────────────────────────────────
LINES = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
N_GAMES = 10000
MAX_DEPTH = 4  # profondeur minimax pour labelliser

# ── Logique de jeu ────────────────────────────────────────────────────────────
def new_state():
    return {
        'boards': [[None]*9 for _ in range(9)],
        'bw': [None]*9,
        'active': None,
        'player': 'X',
        'winner': None
    }

def check_result(cells):
    for a,b,c in LINES:
        if cells[a] and cells[a]==cells[b]==cells[c]:
            return cells[a]
    if all(cells):
        return 'draw'
    return None

def apply_move(state, b, c):
    ns = {
        'boards': [row[:] for row in state['boards']],
        'bw': state['bw'][:],
        'active': state['active'],
        'player': state['player'],
        'winner': state['winner']
    }
    ns['boards'][b][c] = ns['player']
    br = check_result(ns['boards'][b])
    if br: ns['bw'][b] = br
    gr = check_result(ns['bw'])
    if gr: ns['winner'] = gr
    ns['active'] = c if not ns['bw'][c] else None
    ns['player'] = 'O' if ns['player'] == 'X' else 'X'
    return ns

def get_moves(state):
    moves = []
    for b in range(9):
        if state['bw'][b]: continue
        if state['active'] is not None and state['active'] != b: continue
        for c in range(9):
            if not state['boards'][b][c]:
                moves.append((b, c))
    return moves

# ── Encodage de l'état → vecteur (243 features) ───────────────────────────────
# Pour chaque case (9 sous-grilles × 9 cases) : 3 valeurs one-hot [X, O, vide]
# + 9 sous-grilles : 3 valeurs one-hot [X, O, libre]
# + active subboard : 9 valeurs one-hot + 1 (none)
# + joueur courant : 1 valeur
# Total : 9*9*3 + 9*3 + 10 + 1 = 243 + 27 + 11 = 281 features
def encode_state(state):
    features = []

    # Cells
    for b in range(9):
        for c in range(9):
            v = state['boards'][b][c]
            features += [1,0,0] if v=='X' else [0,1,0] if v=='O' else [0,0,1]

    # Subboard winners
    for b in range(9):
        v = state['bw'][b]
        features += [1,0,0] if v=='X' else [0,1,0] if v=='O' else [0,0,1]

    # Active subboard
    act = state['active']
    for i in range(9):
        features.append(1 if act==i else 0)
    features.append(1 if act is None else 0)

    # Current player
    features.append(1 if state['player']=='O' else 0)

    return np.array(features, dtype=np.float32)

# ── Minimax pour labelliser ───────────────────────────────────────────────────
def eval_state(state):
    score = 0
    bw = state['bw']
    boards = state['boards']

    for b in range(9):
        if bw[b] == 'O': score += 100
        elif bw[b] == 'X': score -= 100

    for a,b,c in LINES:
        trio = [bw[a], bw[b], bw[c]]
        ps = trio.count('O'); xs = trio.count('X'); ns = trio.count(None)
        if ps==2 and ns==1: score += 50
        if xs==2 and ns==1: score -= 50
        if ps==1 and ns==2: score += 10
        if xs==1 and ns==2: score -= 10

    if bw[4]=='O': score += 30
    elif bw[4]=='X': score -= 30
    for corner in [0,2,6,8]:
        if bw[corner]=='O': score += 15
        elif bw[corner]=='X': score -= 15

    for b in range(9):
        if bw[b]: continue
        for a,c,d in LINES:
            cells = [boards[b][a], boards[b][c], boards[b][d]]
            ps=cells.count('O'); xs=cells.count('X'); ns=cells.count(None)
            if ps==2 and ns==1: score += 8
            if xs==2 and ns==1: score -= 8
            if ps==1 and ns==2: score += 2
            if xs==1 and ns==2: score -= 2
        if boards[b][4]=='O': score += 4
        elif boards[b][4]=='X': score -= 4

    return score

def minimax(state, depth, is_max, alpha, beta):
    if state['winner'] == 'O': return 1000
    if state['winner'] == 'X': return -1000
    if state['winner'] == 'draw': return 0
    if depth == 0: return eval_state(state)

    moves = get_moves(state)
    if not moves: return 0

    if is_max:
        v = -float('inf')
        for b,c in moves:
            v = max(v, minimax(apply_move(state,b,c), depth-1, False, alpha, beta))
            alpha = max(alpha, v)
            if beta <= alpha: break
        return v
    else:
        v = float('inf')
        for b,c in moves:
            v = min(v, minimax(apply_move(state,b,c), depth-1, True, alpha, beta))
            beta = min(beta, v)
            if beta <= alpha: break
        return v

# ── Génération de parties ─────────────────────────────────────────────────────
def play_random_game():
    """Joue une partie aléatoire, retourne liste d'états."""
    state = new_state()
    states = []
    while not state['winner']:
        moves = get_moves(state)
        if not moves: break
        states.append(deepcopy(state))
        b, c = random.choice(moves)
        state = apply_move(state, b, c)
    return states

def label_state(state):
    """Score minimax depuis la perspective de O."""
    moves = get_moves(state)
    if not moves: return 0.0
    best = -float('inf') if state['player']=='O' else float('inf')
    for b,c in moves:
        ns = apply_move(state, b, c)
        sc = minimax(ns, MAX_DEPTH-1, state['player']=='X', -float('inf'), float('inf'))
        if state['player']=='O':
            best = max(best, sc)
        else:
            best = min(best, sc)
    return float(best)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"Génération de {N_GAMES} parties...")
    X_list = []
    y_list = []

    for i in range(N_GAMES):
        if i % 500 == 0:
            print(f"  {i}/{N_GAMES} parties...")

        states = play_random_game()
        # Labelliser seulement quelques états par partie pour la diversité
        sample = random.sample(states, min(5, len(states)))
        for s in sample:
            enc = encode_state(s)
            score = label_state(s)
            # Normaliser le score entre -1 et 1
            score_norm = np.clip(score / 1000.0, -1.0, 1.0)
            X_list.append(enc)
            y_list.append(score_norm)

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)

    print(f"\n✅ Dataset : {len(X)} exemples, {X.shape[1]} features")
    print(f"   Score min={y.min():.3f} max={y.max():.3f} mean={y.mean():.3f}")

    np.savez('training_data.npz', X=X, y=y)
    print("💾 Sauvegardé dans training_data.npz")

if __name__ == '__main__':
    main()
