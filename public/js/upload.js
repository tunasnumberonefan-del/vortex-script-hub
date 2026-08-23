const $ = (s, r = document) => r.querySelector(s);
const esc = (t) =>
  String(t == null ? '' : t).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); } catch {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
}
function safeName(t) {
  return (t || 'script').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'script';
}

const fileInput = $('#file');
const codeArea = document.querySelector('textarea[name=code]');
fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => { codeArea.value = reader.result; };
  reader.readAsText(f);
});

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#submitBtn');
  const fd = new FormData(e.target);
  const payload = {
    title: (fd.get('title') || '').toString(),
    game: (fd.get('game') || '').toString(),
    description: (fd.get('description') || '').toString(),
    code: (fd.get('code') || '').toString()
  };
  if (!payload.title.trim() || !payload.code.trim()) {
    btn.textContent = 'fill title + code';
    setTimeout(() => (btn.textContent = 'ship it ▸'), 1400);
    return;
  }
  btn.textContent = 'shipping…';
  btn.disabled = true;
  try {
    const r = await fetch('/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'upload failed');
    renderResult(d);
    $('#form').classList.add('hidden');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = err.message && err.message.length < 40 ? err.message : 'ship it ▸';
    setTimeout(() => (btn.textContent = 'ship it ▸'), 2200);
  }
});

function renderResult(d) {
  const el = $('#result');
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="success-h">shipped <b>#${esc(d.id)}</b></div>

    <div class="field">
      <label>script page</label>
      <div class="val"><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.url)}</a></div>
    </div>

    <div class="field">
      <label>raw endpoint (use this in loadstring)</label>
      <div class="val"><a href="${esc(d.rawUrl)}" target="_blank" rel="noopener">${esc(d.rawUrl)}</a></div>
    </div>

    <div class="field">
      <label>one-line loader &mdash; paste into vortex</label>
      <pre id="rls"></pre>
      <div class="row"><button class="btn" id="rlsBtn">copy loadstring</button></div>
    </div>

    <div class="warnbox">
      <p>save your <b>delete key</b> &mdash; it is shown only once and needed to remove the script:</p>
      <div class="val" style="color:var(--danger)">${esc(d.delToken)}</div>
    </div>

    <div class="row">
      <a class="btn primary" href="${esc(d.url)}" target="_blank" rel="noopener">view script</a>
      <a class="btn" href="/">back to archive</a>
    </div>
  `;
  $('#rls').textContent = d.loadstring;
  $('#rlsBtn').addEventListener('click', () => {
    copyText(d.loadstring);
    const b = $('#rlsBtn'); const o = b.textContent; b.textContent = 'copied ✓';
    setTimeout(() => (b.textContent = o), 1100);
  });
}
