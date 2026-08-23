const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ scripts: {}, stats: { serves: 0 } }));
}

let db;
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { db = { scripts: {}, stats: { serves: 0 } }; }
if (!db.scripts) db.scripts = {};
if (!db.stats) db.stats = { serves: 0 };

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const tmp = DATA_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DATA_FILE);
    } catch (e) { console.error('[vortex-hub] persist failed:', e.message); }
  }, 150);
}

function genId() {
  let id;
  do { id = String(10000000 + Math.floor(Math.random() * 90000000)); } while (db.scripts[id]);
  return id;
}

function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim() || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}`;
}

function publicView(s, origin) {
  return {
    id: s.id, title: s.title, game: s.game || '', description: s.description || '',
    views: s.views, size: Buffer.byteLength(s.code, 'utf8'),
    created: s.created, updated: s.updated,
    url: `${origin}/script/${s.id}`,
    rawUrl: `${origin}/scripts/${s.id}/script`,
    loadstring: `loadstring(game:HttpGet("${origin}/scripts/${s.id}/script"))()`
  };
}

const hits = new Map();
function limited(ip) {
  if (hits.size > 4000) hits.clear();
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 12;
}

app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.post('/api/scripts', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.socket.remoteAddress || '?';
  if (limited(ip)) return res.status(429).json({ error: 'slow down. too many uploads this hour.' });
  const { title, game, description, code } = req.body || {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (typeof code !== 'string' || !code.trim()) return res.status(400).json({ error: 'code required' });
  if (title.trim().length > 120) return res.status(400).json({ error: 'title too long (max 120)' });
  if ((game || '').length > 80) return res.status(400).json({ error: 'game name too long (max 80)' });
  if ((description || '').length > 2000) return res.status(400).json({ error: 'description too long (max 2000)' });
  if (Buffer.byteLength(code, 'utf8') > 256 * 1024) return res.status(400).json({ error: 'script too large (max 256kb)' });

  const now = Date.now();
  const s = {
    id: genId(), title: title.trim(), game: (game || '').trim(), description: (description || '').trim(),
    code, url: '', rawUrl: '', loadstring: '', views: 0, created: now, updated: now,
    delToken: crypto.randomBytes(6).toString('hex')
  };
  db.scripts[s.id] = s; persist();
  const origin = baseUrl(req);
  res.status(201).json({ ...publicView(s, origin), delToken: s.delToken });
});

app.get('/api/stats', (_req, res) => {
  const ids = Object.keys(db.scripts);
  const views = ids.reduce((n, k) => n + db.scripts[k].views, 0);
  res.json({ scripts: ids.length, views });
});

app.get('/api/scripts', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase().trim();
  const limit = Math.min(parseInt(req.query.limit) || 60, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const origin = baseUrl(req);
  let all = Object.values(db.scripts).sort((a, b) => b.created - a.created);
  const total = all.length;
  if (q) all = all.filter((s) => s.title.toLowerCase().includes(q) || s.game.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  res.json({ total, count: Math.min(all.length - offset, limit), scripts: all.slice(offset, offset + limit).map((s) => publicView(s, origin)) });
});

app.get('/api/scripts/:id', (req, res) => {
  const s = db.scripts[req.params.id];
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json({ ...publicView(s, baseUrl(req)), code: s.code });
});

app.delete('/api/scripts/:id', (req, res) => {
  const s = db.scripts[req.params.id];
  if (!s) return res.status(404).json({ error: 'not found' });
  if (req.query.key !== s.delToken) return res.status(403).json({ error: 'bad key' });
  delete db.scripts[s.id]; persist();
  res.json({ ok: true });
});

app.get('/scripts/:id/script', (req, res) => {
  const s = db.scripts[req.params.id];
  if (!s) return res.status(404).type('text/plain').send(`--[vortex-hub] script ${req.params.id} not found`);
  s.views++; db.stats.serves++; persist();
  res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.send(s.code.endsWith('\n') ? s.code : s.code + '\n');
});

app.get('/script/:id', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'script.html')));
app.get('/new', (_req, res) => res.redirect('/upload'));

app.use((err, _req, res, _next) => {
  console.error('[vortex-hub] error:', err.message);
  res.status(err.type === 'entity.too.large' ? 413 : 400).json({ error: 'bad request' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/scripts/')) return res.status(404).json({ error: 'not found' });
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => console.log(`[vortex-hub] listening on :${PORT}`));
