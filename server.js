// ─── Ultimate TTT — Serveur Cloud (Railway) ──────────────────────────────────
// Supporte : rooms privées (code 4 lettres) + matchmaking automatique
// Prérequis : npm install ws
// Lancement  : node server.js
// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// ── Logique de jeu ────────────────────────────────────────────────────────────
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function newState() {
  return {
    boards : Array.from({length:9}, () => Array(9).fill(null)),
    bw     : Array(9).fill(null),
    active : null,
    player : 'X',
    winner : null,
    scores : {X:0, O:0},
    _firstPlayer: 'X'
  };
}

function checkResult(cells) {
  for (const [a,b,c] of LINES)
    if (cells[a] && cells[a]===cells[b] && cells[b]===cells[c]) return cells[a];
  if (cells.every(c=>c)) return 'draw';
  return null;
}

function processMove(G, b, c) {
  if (G.winner) return false;
  if (G.active !== null && G.active !== b) return false;
  if (G.bw[b]) return false;
  if (G.boards[b][c]) return false;
  G.boards[b][c] = G.player;
  const br = checkResult(G.boards[b]);
  if (br) G.bw[b] = br;
  const gr = checkResult(G.bw);
  if (gr) { G.winner = gr; if (gr !== 'draw') G.scores[gr]++; }
  G.active = !G.bw[c] ? c : null;
  G.player = G.player === 'X' ? 'O' : 'X';
  return true;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
const rooms = new Map(); // roomId → Room
let matchmakingQueue = []; // [{ws, name, autoMode}]

function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do { id = Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms.has(id));
  return id;
}

function createRoom(id) {
  const room = {
    id,
    G: newState(),
    players: { X: null, O: null },
    names: { X: 'Joueur X', O: 'Joueur O' },
    spectators: [],
    autoMode: false,
    private: false,
  };
  rooms.set(id, room);
  return room;
}

function deleteRoom(id) {
  rooms.delete(id);
  console.log(`[Room ${id}] Supprimée. Rooms actives: ${rooms.size}`);
}

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function broadcastRoom(room, obj) {
  [room.players.X, room.players.O, ...room.spectators].forEach(ws => send(ws, obj));
}

function connectedCount(room) {
  return [room.players.X, room.players.O].filter(Boolean).length;
}

function joinRoom(room, ws, name, role) {
  ws.roomId = room.id;
  ws.role = role;
  ws.playerName = name;

  if (role === 'X') { room.players.X = ws; room.names.X = name; }
  else if (role === 'O') { room.players.O = ws; room.names.O = name; }
  else { room.spectators.push(ws); }

  send(ws, { type: 'role', player: role });
  send(ws, { type: 'state', state: room.G });
  send(ws, { type: 'names', names: room.names });
  send(ws, { type: 'roomId', roomId: room.id });

  if (connectedCount(room) === 2) {
    broadcastRoom(room, { type: 'ready' });
    broadcastRoom(room, { type: 'names', names: room.names });
    console.log(`[Room ${room.id}] Partie démarrée: ${room.names.X} vs ${room.names.O}`);
  } else if (role !== 'spectator') {
    send(ws, { type: 'waiting' });
  }
}

// ── Matchmaking ───────────────────────────────────────────────────────────────
function tryMatchmake() {
  // Nettoyer les WS déconnectés
  matchmakingQueue = matchmakingQueue.filter(p => p.ws.readyState === 1);

  if (matchmakingQueue.length >= 2) {
    const p1 = matchmakingQueue.shift();
    const p2 = matchmakingQueue.shift();

    const roomId = makeRoomId();
    const room = createRoom(roomId);
    room.private = false;

    // Informer les joueurs qu'ils ont un adversaire
    send(p1.ws, { type: 'matched', roomId });
    send(p2.ws, { type: 'matched', roomId });

    joinRoom(room, p1.ws, p1.name, 'X');
    joinRoom(room, p2.ws, p2.name, 'O');

    console.log(`[Matchmaking] Room ${roomId} créée: ${p1.name} vs ${p2.name}`);
  }
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

wss.on('connection', ws => {
  ws.roomId = null;
  ws.role = null;
  ws.playerName = 'Joueur';
  ws.inMatchmaking = false;

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);

      // ── Créer une room privée ──────────────────────────────────────────────
      if (msg.type === 'create_room') {
        const name = (msg.name || 'Joueur').slice(0, 16);
        const roomId = makeRoomId();
        const room = createRoom(roomId);
        room.private = true;
        ws.playerName = name;
        joinRoom(room, ws, name, 'X');
        send(ws, { type: 'room_created', roomId });
        console.log(`[Room ${roomId}] Créée par ${name} (privée)`);
      }

      // ── Rejoindre une room privée par code ────────────────────────────────
      if (msg.type === 'join_room') {
        const code = (msg.roomId || '').toUpperCase().trim();
        const name = (msg.name || 'Joueur').slice(0, 16);
        const room = rooms.get(code);

        if (!room) {
          send(ws, { type: 'error', message: 'Room introuvable. Vérifie le code.' });
          return;
        }
        if (room.players.X && room.players.O) {
          send(ws, { type: 'error', message: 'Cette room est déjà pleine.' });
          return;
        }

        ws.playerName = name;
        const role = !room.players.X ? 'X' : !room.players.O ? 'O' : 'spectator';
        joinRoom(room, ws, name, role);
        console.log(`[Room ${code}] ${name} a rejoint (${role})`);
      }

      // ── Matchmaking ───────────────────────────────────────────────────────
      if (msg.type === 'matchmake') {
        const name = (msg.name || 'Joueur').slice(0, 16);
        ws.playerName = name;
        ws.inMatchmaking = true;

        // Déjà en file ?
        if (!matchmakingQueue.find(p => p.ws === ws)) {
          matchmakingQueue.push({ ws, name, autoMode: !!msg.autoMode });
          send(ws, { type: 'matchmaking', position: matchmakingQueue.length });
          console.log(`[Matchmaking] ${name} en file (${matchmakingQueue.length} en attente)`);
        }

        tryMatchmake();
      }

      // ── Annuler matchmaking ────────────────────────────────────────────────
      if (msg.type === 'cancel_matchmake') {
        matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws);
        ws.inMatchmaking = false;
        send(ws, { type: 'matchmaking_cancelled' });
      }

      // ── Actions en jeu ────────────────────────────────────────────────────
      const room = ws.roomId ? rooms.get(ws.roomId) : null;
      if (!room) return;

      if (msg.type === 'name' && ws.role !== 'spectator') {
        const n = (msg.name || '').slice(0, 16) || `Joueur ${ws.role}`;
        room.names[ws.role] = n;
        broadcastRoom(room, { type: 'names', names: room.names });
      }

      if (msg.type === 'automode' && ws.role === 'X') {
        room.autoMode = !!msg.autoMode;
        broadcastRoom(room, { type: 'automode', autoMode: room.autoMode });
      }

      if (msg.type === 'move') {
        if (ws.role === 'spectator' || ws.role !== room.G.player) return;
        if (processMove(room.G, msg.board, msg.cell))
          broadcastRoom(room, { type: 'state', state: room.G });
      }

      if (msg.type === 'reset' && ws.role !== 'spectator') {
        const scores = room.G.scores;
        const nextStarter = room.G._firstPlayer === 'X' ? 'O' : 'X';
        room.G = newState();
        room.G.scores = scores;
        room.G._firstPlayer = nextStarter;
        room.G.player = nextStarter;
        broadcastRoom(room, { type: 'state', state: room.G });
        broadcastRoom(room, { type: 'names', names: room.names });
        if (connectedCount(room) === 2) broadcastRoom(room, { type: 'ready' });
      }

    } catch(e) { console.error('Message error:', e.message); }
  });

  ws.on('close', () => {
    // Retirer du matchmaking
    matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws);

    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;

    if (room.players.X === ws) {
      room.players.X = null;
      room.names.X = 'Joueur X';
      broadcastRoom(room, { type: 'waiting' });
    } else if (room.players.O === ws) {
      room.players.O = null;
      room.names.O = 'Joueur O';
      broadcastRoom(room, { type: 'waiting' });
    } else {
      room.spectators = room.spectators.filter(s => s !== ws);
    }

    // Supprimer la room si vide
    if (!room.players.X && !room.players.O && room.spectators.length === 0) {
      deleteRoom(room.id);
    }
  });
});

// ── Stats serveur (toutes les 5min) ──────────────────────────────────────────
setInterval(() => {
  const active = [...rooms.values()].filter(r => connectedCount(r) === 2).length;
  const waiting = [...rooms.values()].filter(r => connectedCount(r) === 1).length;
  console.log(`[Stats] Rooms: ${rooms.size} (${active} en jeu, ${waiting} en attente) | Matchmaking: ${matchmakingQueue.length}`);
}, 5 * 60 * 1000);

// ── Démarrage ─────────────────────────────────────────────────────────────────
function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces()))
    for (const i of ifaces)
      if (i.family === 'IPv4' && !i.internal) return i.address;
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n🎮  Ultimate TTT — Serveur Cloud');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Local  →  http://localhost:${PORT}`);
  if (ip !== 'localhost') console.log(`  Réseau →  http://${ip}:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Modes: Room privée | Matchmaking auto');
  console.log(`  Rooms actives: 0\n`);
});
