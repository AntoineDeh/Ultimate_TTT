// ─── Ultimate TTT — Serveur Cloud (Railway) ──────────────────────────────────
// Auth : JWT + bcryptjs + PostgreSQL (persistant)
// Jeu  : rooms privées, matchmaking, timer, chat
// ─────────────────────────────────────────────────────────────────────────────

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const { WebSocketServer } = require('ws');

const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ttt_secret_change_me_in_prod';
const APP_URL    = process.env.APP_URL || 'https://ultimatettt-production.up.railway.app';

// ── PostgreSQL ─────────────────────────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      pseudo       TEXT NOT NULL,
      email        TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar       TEXT DEFAULT '🎮',
      stats        JSONB DEFAULT '{}',
      reset_token  TEXT,
      reset_expires BIGINT,
      created_at   TEXT
    )
  `);
  console.log('[DB] Table users prête');
}

initDB().catch(e => console.error('[DB] Erreur init:', e.message));

// ── Helpers DB ────────────────────────────────────────────────────────────────
async function findUserById(id) {
  const r = await db.query('SELECT * FROM users WHERE id=$1', [id]);
  return r.rows[0] || null;
}

async function findUserByEmail(email) {
  const r = await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  return r.rows[0] || null;
}

async function createUser({ id, pseudo, email, passwordHash, avatar }) {
  await db.query(
    'INSERT INTO users (id, pseudo, email, password_hash, avatar, stats, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, pseudo, email.toLowerCase(), passwordHash, avatar || '🎮', '{}', new Date().toISOString()]
  );
  return findUserById(id);
}

async function updateUser(id, fields) {
  const sets = [], vals = [];
  let i = 1;
  if (fields.pseudo)       { sets.push(`pseudo=$${i++}`);        vals.push(fields.pseudo); }
  if (fields.avatar)       { sets.push(`avatar=$${i++}`);        vals.push(fields.avatar); }
  if (fields.stats)        { sets.push(`stats=$${i++}`);         vals.push(JSON.stringify(fields.stats)); }
  if (fields.passwordHash) { sets.push(`password_hash=$${i++}`); vals.push(fields.passwordHash); }
  if ('resetToken'   in fields) { sets.push(`reset_token=$${i++}`);   vals.push(fields.resetToken); }
  if ('resetExpires' in fields) { sets.push(`reset_expires=$${i++}`); vals.push(fields.resetExpires); }
  if (!sets.length) return;
  vals.push(id);
  await db.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${i}`, vals);
}

async function deleteUser(id) {
  await db.query('DELETE FROM users WHERE id=$1', [id]);
}

function publicProfile(u) {
  return { id: u.id, pseudo: u.pseudo, avatar: u.avatar, stats: u.stats || {} };
}

// ── Email via Brevo API HTTP (contourne le blocage SMTP de Railway) ──────────
async function sendMail(to, subject, html) {
  const apiKey = process.env.BREVO_SMTP_PASS || '';
  const from   = process.env.BREVO_FROM || 'ultimatettt.noreply@gmail.com';
  if (!apiKey) { console.warn('[Mail] BREVO_SMTP_PASS (API key) non defini'); return false; }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Ultimate TTT', email: from },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    const data = await res.json();
    if (res.ok) { console.log('[Mail] Envoye a ' + to); return true; }
    console.error('[Mail] Erreur Brevo API:', JSON.stringify(data));
    return false;
  } catch(e) { console.error('[Mail] Erreur:', e.message); return false; }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
function makeToken(userId) { return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' }); }
function verifyToken(token) { try { return jwt.verify(token, JWT_SECRET); } catch(e) { return null; } }

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

async function authMiddleware(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return findUserById(payload.id);
}

// ── Logique de jeu ────────────────────────────────────────────────────────────
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function newState() {
  return { boards: Array.from({length:9},()=>Array(9).fill(null)), bw: Array(9).fill(null),
    active: null, player: 'X', winner: null, scores: {X:0,O:0}, _firstPlayer: 'X' };
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
  const br = checkResult(G.boards[b]); if (br) G.bw[b] = br;
  const gr = checkResult(G.bw); if (gr) { G.winner = gr; if (gr!=='draw') G.scores[gr]++; }
  G.active = !G.bw[c] ? c : null;
  G.player = G.player==='X'?'O':'X';
  return true;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
const rooms = new Map();
let matchmakingQueue = [];

function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id;
  do { id = Array.from({length:4},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); }
  while (rooms.has(id));
  return id;
}

function createRoom(id) {
  return rooms.set(id, { id, G: newState(),
    players:{X:null,O:null}, names:{X:'Joueur X',O:'Joueur O'},
    avatars:{X:'🎮',O:'🎮'}, userIds:{X:null,O:null},
    spectators:[], autoMode:false, private:false, turnTimer:null }).get(id);
}

function clearTurnTimer(room) { if (room.turnTimer) { clearTimeout(room.turnTimer); room.turnTimer=null; } }

function startTurnTimer(room) {
  clearTurnTimer(room);
  if (room.G.winner || connectedCount(room)<2) return;
  room.turnTimer = setTimeout(() => {
    if (room.G.winner || connectedCount(room)<2) return;
    const {boards,bw,active} = room.G; const moves=[];
    for (let b=0;b<9;b++) { if(bw[b]) continue; if(active!==null&&active!==b) continue;
      for (let c=0;c<9;c++) if(!boards[b][c]) moves.push([b,c]); }
    if (moves.length) {
      const [b,c]=moves[Math.floor(Math.random()*moves.length)];
      if (processMove(room.G,b,c)) { broadcastRoom(room,{type:'state',state:room.G});
        if (!room.G.winner) startTurnTimer(room); }
    }
  }, 35000);
}

function deleteRoom(id) { const r=rooms.get(id); if(r) clearTurnTimer(r); rooms.delete(id); }
function send(ws,obj) { if(ws&&ws.readyState===1) ws.send(JSON.stringify(obj)); }
function broadcastRoom(room,obj) { [room.players.X,room.players.O,...room.spectators].forEach(ws=>send(ws,obj)); }
function connectedCount(room) { return [room.players.X,room.players.O].filter(Boolean).length; }

function joinRoom(room,ws,name,role,avatar) {
  ws.roomId=room.id; ws.role=role; ws.playerName=name;
  if (role==='X') { room.players.X=ws; room.names.X=name; room.avatars.X=avatar||'🎮'; room.userIds.X=ws.userId||null; }
  else if (role==='O') { room.players.O=ws; room.names.O=name; room.avatars.O=avatar||'🎮'; room.userIds.O=ws.userId||null; }
  else { room.spectators.push(ws); }
  send(ws,{type:'role',player:role});
  send(ws,{type:'state',state:room.G});
  send(ws,{type:'names',names:room.names,avatars:room.avatars});
  send(ws,{type:'roomId',roomId:room.id});
  if (connectedCount(room)===2) {
    broadcastRoom(room,{type:'names',names:room.names,avatars:room.avatars});
    broadcastRoom(room,{type:'ready'}); startTurnTimer(room);
  } else if (role!=='spectator') { send(ws,{type:'waiting'}); }
}

function tryMatchmake(autoMode) {
  matchmakingQueue=matchmakingQueue.filter(p=>p.ws.readyState===1);
  const compat=matchmakingQueue.filter(p=>p.autoMode===autoMode);
  if (compat.length>=2) {
    const p1=compat[0],p2=compat[1];
    matchmakingQueue=matchmakingQueue.filter(p=>p!==p1&&p!==p2);
    const roomId=makeRoomId(); const room=createRoom(roomId);
    room.private=false; room.autoMode=autoMode;
    send(p1.ws,{type:'matched',roomId}); send(p2.ws,{type:'matched',roomId});
    joinRoom(room,p1.ws,p1.name,'X',p1.avatar); joinRoom(room,p2.ws,p2.name,'O',p2.avatar);
  }
}

async function recordResultForUser(userId, statKey, result, moves) {
  if (!userId) return;
  const user = await findUserById(userId);
  if (!user) return;
  const stats = user.stats || {};
  ['global', statKey].forEach(k => {
    if (!stats[k]) stats[k] = {win:0,loss:0,draw:0,streak:0,bestStreak:0,fastest:null,longest:0};
    const s = stats[k];
    s[result]++;
    if (result==='win') { s.streak++; if(s.streak>s.bestStreak) s.bestStreak=s.streak;
      if(s.fastest===null||moves<s.fastest) s.fastest=moves; }
    else { s.streak=0; }
    if (moves>s.longest) s.longest=moves;
  });
  await updateUser(userId, { stats });
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method==='OPTIONS') {
    res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE'});
    return res.end();
  }

  // POST /auth/register
  if (req.method==='POST' && url==='/auth/register') {
    const {pseudo,email,password,avatar} = await readBody(req);
    if (!pseudo||!email||!password) return sendJSON(res,400,{error:'Champs manquants.'});
    if (pseudo.length<2||pseudo.length>20) return sendJSON(res,400,{error:'Pseudo : 2 à 20 caractères.'});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res,400,{error:'Email invalide.'});
    if (password.length<6) return sendJSON(res,400,{error:'Mot de passe : 6 caractères minimum.'});
    if (await findUserByEmail(email)) return sendJSON(res,409,{error:'Cet email est déjà utilisé.'});
    const id=crypto.randomUUID();
    try {
      const user=await createUser({id,pseudo:pseudo.trim(),email,passwordHash:await bcrypt.hash(password,10),avatar});
      console.log(`[Auth] Inscription: ${pseudo}`);
      return sendJSON(res,201,{token:makeToken(id),user:publicProfile(user)});
    } catch(e) {
      console.error('[Auth] Erreur inscription DB:', e.message);
      return sendJSON(res,500,{error:'Erreur serveur: ' + e.message});
    }
  }

  // POST /auth/login
  if (req.method==='POST' && url==='/auth/login') {
    const {email,password} = await readBody(req);
    if (!email||!password) return sendJSON(res,400,{error:'Champs manquants.'});
    const user=await findUserByEmail(email);
    if (!user||!(await bcrypt.compare(password,user.password_hash)))
      return sendJSON(res,401,{error:'Email ou mot de passe incorrect.'});
    console.log(`[Auth] Connexion: ${user.pseudo}`);
    return sendJSON(res,200,{token:makeToken(user.id),user:publicProfile(user)});
  }

  // GET /auth/me
  if (req.method==='GET' && url==='/auth/me') {
    const user=await authMiddleware(req);
    if (!user) return sendJSON(res,401,{error:'Non authentifié.'});
    return sendJSON(res,200,{user:publicProfile(user)});
  }

  // PUT /auth/profile
  if (req.method==='PUT' && url==='/auth/profile') {
    const user=await authMiddleware(req);
    if (!user) return sendJSON(res,401,{error:'Non authentifié.'});
    const body=await readBody(req);
    const fields={};
    if (body.pseudo&&body.pseudo.length>=2&&body.pseudo.length<=20) fields.pseudo=body.pseudo.trim();
    if (body.avatar) fields.avatar=body.avatar;
    await updateUser(user.id,fields);
    return sendJSON(res,200,{user:publicProfile(await findUserById(user.id))});
  }

  // DELETE /auth/account
  if (req.method==='DELETE' && url==='/auth/account') {
    const user=await authMiddleware(req);
    if (!user) return sendJSON(res,401,{error:'Non authentifié.'});
    await deleteUser(user.id);
    console.log(`[Auth] Compte supprimé: ${user.email}`);
    return sendJSON(res,200,{ok:true});
  }

  // PUT /auth/stats
  if (req.method==='PUT' && url==='/auth/stats') {
    const user=await authMiddleware(req);
    if (!user) return sendJSON(res,401,{error:'Non authentifié.'});
    const body=await readBody(req);
    if (body.stats&&typeof body.stats==='object') {
      const stats=user.stats||{};
      Object.keys(body.stats).forEach(k=>{
        const inc=body.stats[k];
        if (!stats[k]) { stats[k]=inc; return; }
        const s=stats[k];
        s.win=Math.max(s.win||0,inc.win||0); s.loss=Math.max(s.loss||0,inc.loss||0);
        s.draw=Math.max(s.draw||0,inc.draw||0); s.bestStreak=Math.max(s.bestStreak||0,inc.bestStreak||0);
        s.longest=Math.max(s.longest||0,inc.longest||0);
        if (inc.fastest!=null) s.fastest=s.fastest==null?inc.fastest:Math.min(s.fastest,inc.fastest);
      });
      await updateUser(user.id,{stats});
    }
    return sendJSON(res,200,{user:publicProfile(await findUserById(user.id))});
  }

  // POST /auth/forgot
  if (req.method==='POST' && url==='/auth/forgot') {
    const {email}=await readBody(req);
    if (!email) return sendJSON(res,400,{error:'Email manquant.'});
    // Répondre immédiatement — envoi du mail en arrière-plan
    sendJSON(res,200,{ok:true});
    const user=await findUserByEmail(email);
    if (user) {
      const token=crypto.randomBytes(32).toString('hex');
      const expires=Date.now()+15*60*1000;
      await updateUser(user.id,{resetToken:token,resetExpires:expires});
      const link=`${APP_URL}?reset=${token}`;
      sendMail(user.email,'Réinitialisation mot de passe — Ultimate TTT',
        `<div style="font-family:monospace;background:#05050f;color:#dde0ff;padding:32px;border-radius:12px;max-width:480px;margin:auto;">
        <h2 style="color:#00e5ff;">🎮 ULTIMATE TTT</h2>
        <p style="margin-top:16px;">Tu as demandé à réinitialiser ton mot de passe.</p>
        <p style="opacity:.6;font-size:.85rem;">Ce lien expire dans <strong>15 minutes</strong>.</p>
        <a href="${link}" style="display:inline-block;margin-top:20px;padding:14px 28px;background:rgba(0,229,255,.15);color:#00e5ff;border:1px solid rgba(0,229,255,.4);border-radius:8px;text-decoration:none;font-weight:bold;">
          RÉINITIALISER →
        </a>
        <p style="margin-top:20px;opacity:.4;font-size:.75rem;">Si tu n'as pas fait cette demande, ignore cet email.</p>
        </div>`).catch(e => console.error('[Mail] Erreur background:', e.message));
    }
    return;
  }

  // POST /auth/reset
  if (req.method==='POST' && url==='/auth/reset') {
    const {token,password}=await readBody(req);
    if (!token||!password) return sendJSON(res,400,{error:'Données manquantes.'});
    if (password.length<6) return sendJSON(res,400,{error:'Mot de passe trop court.'});
    const r=await db.query('SELECT * FROM users WHERE reset_token=$1',[token]);
    const user=r.rows[0];
    if (!user) return sendJSON(res,400,{error:'Lien invalide ou déjà utilisé.'});
    if (Date.now()>user.reset_expires) return sendJSON(res,400,{error:'Lien expiré. Refais une demande.'});
    await updateUser(user.id,{passwordHash:await bcrypt.hash(password,10),resetToken:null,resetExpires:null});
    console.log(`[Auth] Mot de passe réinitialisé: ${user.email}`);
    return sendJSON(res,200,{ok:true});
  }

  // Servir index.html
  fs.readFile(path.join(__dirname,'index.html'),(err,data)=>{
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(data);
  });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.roomId=null; ws.role=null; ws.playerName='Joueur';
  ws.playerAvatar='🎮'; ws.userId=null; ws.inMatchmaking=false;

  ws.on('message', async raw => {
    try {
      const msg=JSON.parse(raw);

      if (msg.type==='auth') {
        const payload=verifyToken(msg.token||'');
        if (payload) {
          const user=await findUserById(payload.id);
          if (user) {
            ws.userId=user.id; ws.playerName=user.pseudo; ws.playerAvatar=user.avatar;
            send(ws,{type:'auth_ok',user:publicProfile(user)});
          } else { send(ws,{type:'auth_error'}); }
        } else { send(ws,{type:'auth_error'}); }
        return;
      }

      if (msg.type==='create_room') {
        const room=createRoom(makeRoomId()); room.private=true;
        room.autoMode = !!msg.autoMode;
        room.tournament = !!msg.tournament;
        joinRoom(room,ws,ws.playerName||'Joueur','X',ws.playerAvatar||'🎮');
        send(ws,{type:'room_created',roomId:room.id});
      }

      if (msg.type==='join_room') {
        const code=(msg.roomId||'').toUpperCase().trim();
        const room=rooms.get(code);
        if (!room) { send(ws,{type:'error',message:'Room introuvable.'}); return; }
        if (room.players.X&&room.players.O) { send(ws,{type:'error',message:'Room pleine.'}); return; }
        joinRoom(room,ws,ws.playerName||'Joueur',!room.players.X?'X':'O',ws.playerAvatar||'🎮');
        // Envoyer les params du créateur au rejoignant
        send(ws,{type:'automode', autoMode:room.autoMode, tournament:room.tournament});
      }

      if (msg.type==='matchmake') {
        ws.inMatchmaking=true; const auto=!!msg.autoMode;
        if (!matchmakingQueue.find(p=>p.ws===ws)) {
          matchmakingQueue.push({ws,name:ws.playerName,avatar:ws.playerAvatar,autoMode:auto});
          send(ws,{type:'matchmaking',position:matchmakingQueue.filter(p=>p.autoMode===auto).length});
        }
        tryMatchmake(auto);
      }

      if (msg.type==='cancel_matchmake') {
        matchmakingQueue=matchmakingQueue.filter(p=>p.ws!==ws);
        ws.inMatchmaking=false; send(ws,{type:'matchmaking_cancelled'});
      }

      const room=ws.roomId?rooms.get(ws.roomId):null;
      if (!room) return;

      if (msg.type==='automode'&&ws.role==='X') {
        room.autoMode=!!msg.autoMode; broadcastRoom(room,{type:'automode',autoMode:room.autoMode});
      }

      if (msg.type==='move') {
        if (ws.role==='spectator'||ws.role!==room.G.player) return;
        if (processMove(room.G,msg.board,msg.cell)) {
          broadcastRoom(room,{type:'state',state:room.G});
          if (!room.G.winner) { startTurnTimer(room); }
          else {
            clearTurnTimer(room);
            const moves=room.G.boards.flat().filter(Boolean).length;
            if (room.userIds.X) await recordResultForUser(room.userIds.X,'online',room.G.winner==='X'?'win':room.G.winner==='draw'?'draw':'loss',moves);
            if (room.userIds.O) await recordResultForUser(room.userIds.O,'online',room.G.winner==='O'?'win':room.G.winner==='draw'?'draw':'loss',moves);
          }
        }
      }

      if (msg.type==='abandon') {
        const winner = ws.role==='X' ? 'O' : 'X';
        room.G.winner = winner;
        room.G.scores[winner]++;
        clearTurnTimer(room);
        const opponent = ws.role==='X' ? room.players.O : room.players.X;
        send(opponent, { type:'abandon' });
        broadcastRoom(room, { type:'state', state:room.G });
      }

      if (msg.type==='chat') {
        const text=(msg.msg||'').slice(0,120);
        if (text&&ws.role!=='spectator') send(ws.role==='X'?room.players.O:room.players.X,{type:'chat',msg:text});
      }

      if (msg.type==='reset'&&ws.role!=='spectator') {
        const scores=room.G.scores; const next=room.G._firstPlayer==='X'?'O':'X';
        room.G=newState(); room.G.scores=scores; room.G._firstPlayer=next; room.G.player=next;
        broadcastRoom(room,{type:'state',state:room.G});
        broadcastRoom(room,{type:'names',names:room.names,avatars:room.avatars});
        if (connectedCount(room)===2) { broadcastRoom(room,{type:'ready'}); startTurnTimer(room); }
      }

    } catch(e) { console.error('WS error:',e.message); }
  });

  ws.on('close',()=>{
    matchmakingQueue=matchmakingQueue.filter(p=>p.ws!==ws);
    const room=ws.roomId?rooms.get(ws.roomId):null;
    if (!room) return;
    clearTurnTimer(room);
    if (room.players.X===ws) { room.players.X=null; room.names.X='Joueur X'; broadcastRoom(room,{type:'waiting'}); }
    else if (room.players.O===ws) { room.players.O=null; room.names.O='Joueur O'; broadcastRoom(room,{type:'waiting'}); }
    else { room.spectators=room.spectators.filter(s=>s!==ws); }
    if (!room.players.X&&!room.players.O&&room.spectators.length===0) deleteRoom(room.id);
  });
});

setInterval(async()=>{
  const active=[...rooms.values()].filter(r=>connectedCount(r)===2).length;
  const count=await db.query('SELECT COUNT(*) FROM users').then(r=>r.rows[0].count).catch(()=>'?');
  console.log(`[Stats] Rooms:${rooms.size}(${active} en jeu) | Queue:${matchmakingQueue.length} | Users:${count}`);
},5*60*1000);

server.listen(PORT,'0.0.0.0',()=>{
  console.log('\n🎮  Ultimate TTT — Serveur Auth+Jeu (PostgreSQL)');
  console.log(`  http://localhost:${PORT}`);
  console.log('  POST /auth/register | /auth/login | GET /auth/me\n');
});
