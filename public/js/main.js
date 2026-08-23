const $ = (s, r = document) => r.querySelector(s);
const esc = (t) =>
  String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
const fmt = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
const truncate = (t, n) => (t && t.length > n ? t.slice(0, n) + '…' : t || '');

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

async function loadStats() {
  try {
    const r = await fetch('/api/stats');
    const d = await r.json();
    $('#stScripts').textContent = fmt(d.scripts);
    $('#stViews').textContent = fmt(d.views);
  } catch {}
}

function cardHTML(s) {
  const desc = s.description ? esc(truncate(s.description, 90)) : '';
  return `<article class="card" data-id="${esc(s.id)}">
    <div class="card-top"><span class="sid">#${esc(s.id)}</span><span>${esc(s.game) || 'universal'}</span></div>
    <h3>${esc(s.title)}</h3>
    ${desc ? `<p class="desc">${desc}</p>` : ''}
    <div class="card-bot">
      <span class="execs">&#9656; ${fmt(s.views)} execs &middot; ${fmt(s.size)}b</span>
      <button class="btn copyls" data-ls="${esc(s.loadstring)}">copy loadstring</button>
    </div>
  </article>`;
}

async function loadList(q = '') {
  const listEl = $('#list');
  const empty = $('#empty');
  listEl.innerHTML = '<div class="loading">fetching archive&hellip;</div>';
  try {
    const url = '/api/scripts' + (q ? '?q=' + encodeURIComponent(q) : '');
    const r = await fetch(url);
    const d = await r.json();
    if (!d.scripts.length) { listEl.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    listEl.innerHTML = d.scripts.map(cardHTML).join('');
  } catch { listEl.innerHTML = '<div class="loading err">archive unreachable.</div>'; }
}

let t;
$('#search').addEventListener('input', (e) => {
  clearTimeout(t);
  const v = e.target.value.trim();
  t = setTimeout(() => loadList(v), 250);
});

document.addEventListener('click', (e) => {
  const ls = e.target.closest('.copyls');
  if (ls) { e.stopPropagation(); copyText(ls.dataset.ls); flash(ls, 'copied ✓'); return; }
  const card = e.target.closest('.card');
  if (card) location.href = '/script/' + card.dataset.id;
});

loadStats();
loadList();
