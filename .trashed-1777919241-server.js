// ─── Ultimate TTT — Serveur multijoueur local ────────────────────────────────
// Prérequis : Node.js installé
// Installation : npm install ws
// Lancement    : node server.js
// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { WebSocketServer } = require('ws');

const PORT = 3000;

// ── Logique de jeu ────────────────────────────────────────────────────────────
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function newState() {
  return {
    boards : Array.from({length:9}, () => Array(9).fill(null)),
    bw     : Array(9).fill(null),
    active : null,
    player : 'X',
    winner : null,
    scores : {X:0, O:0}
  };
}

function checkResult(cells) {
  for (const [a,b,c] of LINES)
    if (cells[a] && cells[a]===cells[b] && cells[b]===cells[c]) return cells[a];
  if (cells.every(c=>c)) return 'draw';
  return null;
}

let G = newState();

function processMove(b, c) {
  if (G.winner) return false;
  if (G.active !== null && G.active !== b) return false;
  if (G.bw[b]) return false;
  if (G.boards[b][c]) return false;

  G.boards[b][c] = G.player;
  const br = checkResult(G.boards[b]);
  if (br) G.bw[b] = br;
  const gr = checkResult(G.bw);
  if (gr) {
    G.winner = gr;
    if (gr !== 'draw') G.scores[gr]++;
  }
  G.active = !G.bw[c] ? c : null;
  G.player = G.player === 'X' ? 'O' : 'X';
  return true;
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const file = path.join(__dirname, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('index.html introuvable'); return; }
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    res.end(data);
  });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
let players = { X: null, O: null };
let spectators = [];

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcast(obj) {
  [players.X, players.O, ...spectators].forEach(ws => send(ws, obj));
}

function connectedCount() {
  return [players.X, players.O].filter(Boolean).length;
}

wss.on('connection', ws => {
  let role;
  if      (!players.X) { players.X = ws; role = 'X'; }
  else if (!players.O) { players.O = ws; role = 'O'; }
  else                 { spectators.push(ws); role = 'spectator'; }

  send(ws, { type: 'role',  player: role });
  send(ws, { type: 'state', state: G });

  if (connectedCount() === 2) broadcast({ type: 'ready' });
  else if (role !== 'spectator') send(ws, { type: 'waiting' });

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'move') {
        if (role === 'spectator' || role !== G.player) return;
        if (processMove(msg.board, msg.cell))
          broadcast({ type: 'state', state: G });
      }

      if (msg.type === 'reset' && role !== 'spectator') {
        const scores = G.scores;
        G = newState();
        G.scores = scores;
        broadcast({ type: 'state', state: G });
        if (connectedCount() === 2) broadcast({ type: 'ready' });
      }
    } catch(_) {}
  });

  ws.on('close', () => {
    if      (players.X === ws) { players.X = null; broadcast({ type: 'waiting' }); }
    else if (players.O === ws) { players.O = null; broadcast({ type: 'waiting' }); }
    else spectators = spectators.filter(s => s !== ws);
  });
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces()))
    for (const i of ifaces)
      if (i.family === 'IPv4' && !i.internal) return i.address;
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n🎮  Ultimate TTT — Serveur multijoueur');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Local  →  http://localhost:${PORT}`);
  console.log(`  Réseau →  http://${ip}:${PORT}   ← partager à votre ami`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1er connecté = Joueur X');
  console.log('  2e connecté  = Joueur O\n');
});
