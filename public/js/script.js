const $ = (s, r = document) => r.querySelector(s);
const esc = (t) =>
  String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
const fmt = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); } catch {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
}
function flash(btn, msg) { const old = btn.textContent; btn.textContent = msg; setTimeout(() => (btn.textContent = old), 1100); }

const id = location.pathname.split('/').filter(Boolean).pop();

async function load() {
  const errEl = $('#err');
  const content = $('#content');
  try {
    const r = await fetch('/api/scripts/' + encodeURIComponent(id));
    if (!r.ok) throw new Error('not found');
    const d = await r.json();

    document.title = d.title + ' · vortex_hub';
    $('#title').textContent = d.title;
    $('#sid').textContent = '#' + d.id;
    $('#game').textContent = d.game || 'universal';
    $('#views').textContent = fmt(d.views) + ' execs';
    $('#size').textContent = fmt(d.size) + 'b';
    $('#date').textContent = new Date(d.created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const desc = $('#desc');
    if (d.description) desc.textContent = d.description; else desc.classList.add('hidden');

    $('#loadstr').textContent = d.loadstring;

    const raw = $('#rawlink');
    raw.textContent = d.rawUrl;
    raw.href = d.rawUrl;

    const codeEl = $('#code');
    codeEl.textContent = d.code;

    const dl = $('#btnDl');
    dl.href = d.rawUrl;
    dl.download = d.title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40) + '.lua';

    errEl.classList.add('hidden');
    content.classList.remove('hidden');
  } catch {
    errEl.classList.remove('hidden');
    content.classList.add('hidden');
  }
}

$('#btnLs').addEventListener('click', () => { copyText($('#loadstr').textContent); flash($('#btnLs'), 'copied ✓'); });
$('#btnCode').addEventListener('click', () => { copyText($('#code').textContent); flash($('#btnCode'), 'copied ✓'); });

$('#btnDel').addEventListener('click', async () => {
  const key = $('#delkey').value.trim();
  const msg = $('#delmsg');
  if (!key) { msg.textContent = 'enter the delete key'; msg.className = 'err'; return; }
  if (!confirm('delete script #' + id + ' permanently?')) return;
  try {
    const r = await fetch('/api/scripts/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(key), { method: 'DELETE' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'failed');
    msg.textContent = 'deleted.'; msg.className = 'ok';
    setTimeout(() => (location.href = '/'), 900);
  } catch (err) {
    msg.textContent = err.message || 'failed';
    msg.className = 'err';
  }
});

load();
