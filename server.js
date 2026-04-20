// ─── Ultimate TTT — Serveur Cloud (Railway) ──────────────────────────────────
// Auth : inscription / connexion JWT + bcryptjs
// Jeu  : rooms privées, matchmaking, timer, chat
// ─────────────────────────────────────────────────────────────────────────────

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { WebSocketServer } = require('ws');

const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ttt_secret_change_me_in_prod';
const USERS_FILE   = path.join(__dirname, 'users.json');
const RESEND_KEY   = process.env.RESEND_API_KEY || '';  // à définir dans Railway
const APP_URL      = process.env.APP_URL || 'https://ultimatettt-production.up.railway.app';
const FROM_EMAIL   = 'Ultimate TTT <noreply@resend.dev>'; // domaine gratuit Resend

// ── Email via Resend ──────────────────────────────────────────────────────────
async function sendMail(to, subject, html) {
  if (!RESEND_KEY) {
    console.warn('[Mail] RESEND_API_KEY non défini — mail non envoyé');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
    });
    const data = await res.json();
    if (res.ok) { console.log(`[Mail] Envoyé à ${to}`); return true; }
    console.error('[Mail] Erreur Resend:', data);
    return false;
  } catch(e) {
    console.error('[Mail] Erreur réseau:', e.message);
    return false;
  }
}

// ── Persistance utilisateurs ──────────────────────────────────────────────────
let users = {};

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      console.log(`[Auth] ${Object.keys(users).length} utilisateur(s) chargé(s)`);
    }
  } catch(e) { console.error('[Auth] Erreur chargement users.json:', e.message); }
}

function saveUsers() {
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); }
  catch(e) { console.error('[Auth] Erreur sauvegarde users.json:', e.message); }
}

loadUsers();
setInterval(saveUsers, 2 * 60 * 1000);

function findUserByEmail(email) {
  return Object.values(users).find(u => u.email === email.toLowerCase());
}

function emptyStats() {
  return { win:0, loss:0, draw:0, streak:0, bestStreak:0, fastest:null, longest:0 };
}

function makeToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch(e) { return null; }
}

function publicProfile(user) {
  return { id: user.id, pseudo: user.pseudo, avatar: user.avatar, stats: user.stats };
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function authMiddleware(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return users[payload.id] || null;
}

// ── Logique de jeu ────────────────────────────────────────────────────────────
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function newState() {
  return {
    boards: Array.from({length:9}, () => Array(9).fill(null)),
    bw: Array(9).fill(null), active: null, player: 'X',
    winner: null, scores: {X:0, O:0}, _firstPlayer: 'X'
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
const rooms = new Map();
let matchmakingQueue = [];

function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do { id = Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms.has(id));
  return id;
}

function createRoom(id) {
  return rooms.set(id, {
    id, G: newState(),
    players: {X:null,O:null}, names: {X:'Joueur X',O:'Joueur O'},
    avatars: {X:'🎮',O:'🎮'}, userIds: {X:null,O:null},
    spectators: [], autoMode: false, private: false, turnTimer: null,
  }).get(id);
}

function clearTurnTimer(room) {
  if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer = null; }
}

function startTurnTimer(room) {
  clearTurnTimer(room);
  if (room.G.winner || connectedCount(room) < 2) return;
  room.turnTimer = setTimeout(() => {
    if (room.G.winner || connectedCount(room) < 2) return;
    const { boards, bw, active } = room.G;
    const moves = [];
    for (let b=0;b<9;b++) {
      if (bw[b]) continue;
      if (active !== null && active !== b) continue;
      for (let c=0;c<9;c++) if (!boards[b][c]) moves.push([b,c]);
    }
    if (moves.length) {
      const [b,c] = moves[Math.floor(Math.random()*moves.length)];
      if (processMove(room.G, b, c)) {
        broadcastRoom(room, { type: 'state', state: room.G });
        if (!room.G.winner) startTurnTimer(room);
      }
    }
  }, 35000);
}

function deleteRoom(id) {
  const room = rooms.get(id);
  if (room) clearTurnTimer(room);
  rooms.delete(id);
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

function joinRoom(room, ws, name, role, avatar) {
  ws.roomId = room.id; ws.role = role; ws.playerName = name;
  if (role === 'X') { room.players.X = ws; room.names.X = name; room.avatars.X = avatar||'🎮'; room.userIds.X = ws.userId||null; }
  else if (role === 'O') { room.players.O = ws; room.names.O = name; room.avatars.O = avatar||'🎮'; room.userIds.O = ws.userId||null; }
  else { room.spectators.push(ws); }
  send(ws, { type: 'role', player: role });
  send(ws, { type: 'state', state: room.G });
  send(ws, { type: 'names', names: room.names, avatars: room.avatars });
  send(ws, { type: 'roomId', roomId: room.id });
  if (connectedCount(room) === 2) {
    broadcastRoom(room, { type: 'names', names: room.names, avatars: room.avatars });
    broadcastRoom(room, { type: 'ready' });
    startTurnTimer(room);
  } else if (role !== 'spectator') {
    send(ws, { type: 'waiting' });
  }
}

function tryMatchmake(autoMode) {
  matchmakingQueue = matchmakingQueue.filter(p => p.ws.readyState === 1);
  const compat = matchmakingQueue.filter(p => p.autoMode === autoMode);
  if (compat.length >= 2) {
    const p1 = compat[0], p2 = compat[1];
    matchmakingQueue = matchmakingQueue.filter(p => p !== p1 && p !== p2);
    const roomId = makeRoomId();
    const room = createRoom(roomId);
    room.private = false; room.autoMode = autoMode;
    send(p1.ws, { type: 'matched', roomId });
    send(p2.ws, { type: 'matched', roomId });
    joinRoom(room, p1.ws, p1.name, 'X', p1.avatar);
    joinRoom(room, p2.ws, p2.name, 'O', p2.avatar);
  }
}

function recordResultForUser(userId, statKey, result, moves) {
  if (!userId || !users[userId]) return;
  const user = users[userId];
  if (!user.stats) user.stats = {};
  ['global', statKey].forEach(k => {
    if (!user.stats[k]) user.stats[k] = emptyStats();
    const s = user.stats[k];
    s[result]++;
    if (result === 'win') {
      s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      if (s.fastest === null || moves < s.fastest) s.fastest = moves;
    } else { s.streak = 0; }
    if (moves > s.longest) s.longest = moves;
  });
  saveUsers();
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PUT' });
    return res.end();
  }

  if (req.method === 'POST' && url === '/auth/register') {
    const { pseudo, email, password, avatar } = await readBody(req);
    if (!pseudo || !email || !password) return sendJSON(res, 400, { error: 'Champs manquants.' });
    if (pseudo.length < 2 || pseudo.length > 20) return sendJSON(res, 400, { error: 'Pseudo : 2 à 20 caractères.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 400, { error: 'Email invalide.' });
    if (password.length < 6) return sendJSON(res, 400, { error: 'Mot de passe : 6 caractères minimum.' });
    if (findUserByEmail(email)) return sendJSON(res, 409, { error: 'Cet email est déjà utilisé.' });
    const id = crypto.randomUUID();
    users[id] = { id, pseudo: pseudo.trim(), email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), avatar: avatar||'🎮', stats: {}, createdAt: new Date().toISOString() };
    saveUsers();
    console.log(`[Auth] Inscription: ${pseudo}`);
    return sendJSON(res, 201, { token: makeToken(id), user: publicProfile(users[id]) });
  }

  if (req.method === 'POST' && url === '/auth/login') {
    const { email, password } = await readBody(req);
    if (!email || !password) return sendJSON(res, 400, { error: 'Champs manquants.' });
    const user = findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return sendJSON(res, 401, { error: 'Email ou mot de passe incorrect.' });
    console.log(`[Auth] Connexion: ${user.pseudo}`);
    return sendJSON(res, 200, { token: makeToken(user.id), user: publicProfile(user) });
  }

  if (req.method === 'GET' && url === '/auth/me') {
    const user = authMiddleware(req);
    if (!user) return sendJSON(res, 401, { error: 'Non authentifié.' });
    return sendJSON(res, 200, { user: publicProfile(user) });
  }

  // ── POST /auth/forgot ─────────────────────────────────────────────────────
  if (req.method === 'POST' && url === '/auth/forgot') {
    const { email } = await readBody(req);
    if (!email) return sendJSON(res, 400, { error: 'Email manquant.' });

    // Toujours répondre 200 (pas de fuite d'info sur l'existence du compte)
    const user = findUserByEmail(email);
    if (user) {
      const token     = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
      user.resetToken   = token;
      user.resetExpires = expiresAt;
      saveUsers();

      const link = `${APP_URL}?reset=${token}`;
      await sendMail(
        user.email,
        'Réinitialisation de ton mot de passe — Ultimate TTT',
        `
        <div style="font-family:monospace;background:#05050f;color:#dde0ff;padding:32px;border-radius:12px;max-width:480px;margin:auto;">
          <h2 style="color:#00e5ff;letter-spacing:.1em;font-size:1.1rem;">🎮 ULTIMATE TTT</h2>
          <p style="margin-top:16px;">Tu as demandé à réinitialiser ton mot de passe.</p>
          <p style="margin-top:8px;opacity:.6;font-size:.85rem;">Ce lien expire dans <strong>15 minutes</strong>.</p>
          <a href="${link}" style="display:inline-block;margin-top:20px;padding:14px 28px;background:rgba(0,229,255,.15);color:#00e5ff;border:1px solid rgba(0,229,255,.4);border-radius:8px;text-decoration:none;font-weight:bold;letter-spacing:.1em;">
            RÉINITIALISER MON MOT DE PASSE →
          </a>
          <p style="margin-top:20px;opacity:.4;font-size:.75rem;">Si tu n'as pas fait cette demande, ignore cet email.</p>
        </div>
        `
      );
      console.log(`[Auth] Reset demandé : ${user.email} | Token: ${token.slice(0,8)}...`);
    }
    return sendJSON(res, 200, { ok: true });
  }

  // ── POST /auth/reset ───────────────────────────────────────────────────────
  if (req.method === 'POST' && url === '/auth/reset') {
    const { token, password } = await readBody(req);
    if (!token || !password) return sendJSON(res, 400, { error: 'Données manquantes.' });
    if (password.length < 6)  return sendJSON(res, 400, { error: 'Mot de passe trop court.' });

    const user = Object.values(users).find(u => u.resetToken === token);
    if (!user)                          return sendJSON(res, 400, { error: 'Lien invalide ou déjà utilisé.' });
    if (Date.now() > user.resetExpires) return sendJSON(res, 400, { error: 'Lien expiré. Refais une demande.' });

    user.passwordHash  = await bcrypt.hash(password, 10);
    user.resetToken    = null;
    user.resetExpires  = null;
    saveUsers();
    console.log(`[Auth] Mot de passe réinitialisé : ${user.email}`);
    return sendJSON(res, 200, { ok: true });
  }

  if (req.method === 'PUT' && url === '/auth/profile') {
    const user = authMiddleware(req);
    if (!user) return sendJSON(res, 401, { error: 'Non authentifié.' });
    const body = await readBody(req);
    if (body.pseudo && body.pseudo.length >= 2 && body.pseudo.length <= 20) user.pseudo = body.pseudo.trim();
    if (body.avatar) user.avatar = body.avatar;
    saveUsers();
    return sendJSON(res, 200, { user: publicProfile(user) });
  }

  // ── DELETE /auth/account ──────────────────────────────────────────────────
  if (req.method === 'DELETE' && url === '/auth/account') {
    const user = authMiddleware(req);
    if (!user) return sendJSON(res, 401, { error: 'Non authentifié.' });
    delete users[user.id];
    saveUsers();
    console.log(`[Auth] Compte supprimé : ${user.email}`);
    return sendJSON(res, 200, { ok: true });
  }

  if (req.method === 'PUT' && url === '/auth/stats') {
    const user = authMiddleware(req);
    if (!user) return sendJSON(res, 401, { error: 'Non authentifié.' });
    const body = await readBody(req);
    if (body.stats && typeof body.stats === 'object') {
      if (!user.stats) user.stats = {};
      Object.keys(body.stats).forEach(k => {
        const inc = body.stats[k];
        if (!user.stats[k]) { user.stats[k] = inc; return; }
        const s = user.stats[k];
        s.win = Math.max(s.win||0, inc.win||0);
        s.loss = Math.max(s.loss||0, inc.loss||0);
        s.draw = Math.max(s.draw||0, inc.draw||0);
        s.bestStreak = Math.max(s.bestStreak||0, inc.bestStreak||0);
        s.longest = Math.max(s.longest||0, inc.longest||0);
        if (inc.fastest != null) s.fastest = s.fastest == null ? inc.fastest : Math.min(s.fastest, inc.fastest);
      });
      saveUsers();
    }
    return sendJSON(res, 200, { user: publicProfile(user) });
  }

  // Servir index.html
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.roomId = null; ws.role = null; ws.playerName = 'Joueur';
  ws.playerAvatar = '🎮'; ws.userId = null; ws.inMatchmaking = false;

  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'auth') {
        const payload = verifyToken(msg.token || '');
        if (payload && users[payload.id]) {
          ws.userId = payload.id;
          ws.playerName = users[payload.id].pseudo;
          ws.playerAvatar = users[payload.id].avatar;
          send(ws, { type: 'auth_ok', user: publicProfile(users[payload.id]) });
        } else {
          send(ws, { type: 'auth_error' });
        }
        return;
      }

      if (msg.type === 'create_room') {
        const name = (ws.playerName||'Joueur').slice(0,20);
        const avatar = ws.playerAvatar||'🎮';
        const roomId = makeRoomId();
        const room = createRoom(roomId);
        room.private = true;
        joinRoom(room, ws, name, 'X', avatar);
        send(ws, { type: 'room_created', roomId });
      }

      if (msg.type === 'join_room') {
        const code = (msg.roomId||'').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { type:'error', message:'Room introuvable.' }); return; }
        if (room.players.X && room.players.O) { send(ws, { type:'error', message:'Room pleine.' }); return; }
        joinRoom(room, ws, ws.playerName||'Joueur', !room.players.X?'X':'O', ws.playerAvatar||'🎮');
      }

      if (msg.type === 'matchmake') {
        ws.inMatchmaking = true;
        const auto = !!msg.autoMode;
        if (!matchmakingQueue.find(p => p.ws === ws)) {
          matchmakingQueue.push({ ws, name: ws.playerName, avatar: ws.playerAvatar, autoMode: auto });
          const pos = matchmakingQueue.filter(p => p.autoMode === auto).length;
          send(ws, { type: 'matchmaking', position: pos });
        }
        tryMatchmake(auto);
      }

      if (msg.type === 'cancel_matchmake') {
        matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws);
        ws.inMatchmaking = false;
        send(ws, { type: 'matchmaking_cancelled' });
      }

      const room = ws.roomId ? rooms.get(ws.roomId) : null;
      if (!room) return;

      if (msg.type === 'automode' && ws.role === 'X') {
        room.autoMode = !!msg.autoMode;
        broadcastRoom(room, { type: 'automode', autoMode: room.autoMode });
      }

      if (msg.type === 'move') {
        if (ws.role === 'spectator' || ws.role !== room.G.player) return;
        if (processMove(room.G, msg.board, msg.cell)) {
          broadcastRoom(room, { type: 'state', state: room.G });
          if (!room.G.winner) { startTurnTimer(room); }
          else {
            clearTurnTimer(room);
            const moves = room.G.boards.flat().filter(Boolean).length;
            if (room.userIds.X) recordResultForUser(room.userIds.X, 'online', room.G.winner==='X'?'win':room.G.winner==='draw'?'draw':'loss', moves);
            if (room.userIds.O) recordResultForUser(room.userIds.O, 'online', room.G.winner==='O'?'win':room.G.winner==='draw'?'draw':'loss', moves);
          }
        }
      }

      if (msg.type === 'chat') {
        const text = (msg.msg||'').slice(0,120);
        if (text && ws.role !== 'spectator') {
          send(ws.role==='X'?room.players.O:room.players.X, { type:'chat', msg:text });
        }
      }

      if (msg.type === 'reset' && ws.role !== 'spectator') {
        const scores = room.G.scores;
        const next = room.G._firstPlayer==='X'?'O':'X';
        room.G = newState();
        room.G.scores = scores; room.G._firstPlayer = next; room.G.player = next;
        broadcastRoom(room, { type:'state', state:room.G });
        broadcastRoom(room, { type:'names', names:room.names, avatars:room.avatars });
        if (connectedCount(room) === 2) { broadcastRoom(room, { type:'ready' }); startTurnTimer(room); }
      }

    } catch(e) { console.error('WS error:', e.message); }
  });

  ws.on('close', () => {
    matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws);
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    clearTurnTimer(room);
    if (room.players.X === ws) { room.players.X = null; room.names.X = 'Joueur X'; broadcastRoom(room, { type:'waiting' }); }
    else if (room.players.O === ws) { room.players.O = null; room.names.O = 'Joueur O'; broadcastRoom(room, { type:'waiting' }); }
    else { room.spectators = room.spectators.filter(s => s !== ws); }
    if (!room.players.X && !room.players.O && room.spectators.length === 0) deleteRoom(room.id);
  });
});

setInterval(() => {
  const active = [...rooms.values()].filter(r=>connectedCount(r)===2).length;
  console.log(`[Stats] Rooms:${rooms.size} (${active} en jeu) | Queue:${matchmakingQueue.length} | Users:${Object.keys(users).length}`);
}, 5*60*1000);

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces()))
    for (const i of ifaces)
      if (i.family==='IPv4' && !i.internal) return i.address;
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🎮  Ultimate TTT — Serveur Auth + Jeu');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  http://localhost:${PORT}`);
  console.log('  POST /auth/register | POST /auth/login | GET /auth/me');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
