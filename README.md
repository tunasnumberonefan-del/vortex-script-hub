# vortex-script-hub

Minimalist, stylized luau **script archive** for **Vortex** (`playvortex.io`). Users upload scripts, get a clean raw endpoint, and a one-line loader:

```lua
loadstring(game:HttpGet("https://your-domain.up.railway.app/scripts/68178958/script"))()
```

Built with **Node.js + Express**, zero build step, vanilla frontend, JSON file store. Deploys to **Railway** in minutes.

> Not affiliated with playvortex.io. Community script archive.

---

## Features

- Terminal / hacker minimalist aesthetic (monospace, green-on-black, scanlines)
- Upload page (paste or upload `.lua`/`.luau`/`.txt`)
- Archive with live search (title / game / description)
- Per-script viewer: source, copy, download `.lua`, one-line loader
- **Raw endpoint** `/scripts/:id/script` — returns pure `text/plain` luau so `loadstring(game:HttpGet(...))()` works from inside Vortex
- Execution counter, CORS-open raw, x-forwarded host aware (auto domain detection)
- Per-script **delete key** (shown once after upload)
- Basic hourly rate limit on uploads

---

## Local dev

```bash
npm install
npm start
# open http://localhost:3000
```

Data is stored in `./data/db.json` (auto-created). Set `DATA_DIR` to persist elsewhere.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | archive |
| GET | `/upload` | upload form |
| GET | `/script/:id` | script viewer |
| GET | `/scripts/:id/script` | **raw luau** (text/plain) |
| GET | `/api/scripts?q=` | list / search (JSON) |
| GET | `/api/scripts/:id` | script metadata + code (JSON) |
| POST | `/api/scripts` | create `{title, game?, description?, code}` (JSON) |
| GET | `/api/stats` | `{scripts, views}` |
| DELETE | `/api/scripts/:id?key=DELTOKEN` | delete |

---

## Deploy to Railway

1. Push the code to GitHub.
2. Go to **https://railway.app** → **Login** → choose **GitHub**.
3. **New Project** → **Deploy from GitHub repo** → pick the repo → **Deploy**.
4. To keep uploads across redeploys: project → **Settings / Storage (Volumes)** → **New Volume** → mount path `/data` → redeploy.
5. Add env var **`DATA_DIR`** = `/data` → redeploy.
6. **Settings → Networking → Generate Domain** (or add a Custom Domain + CNAME).
7. Test: open the domain, upload a script, then from Vortex:

```lua
loadstring(game:HttpGet("https://YOUR-DOMAIN.up.railway.app/scripts/ID/script"))()
```

---

## Push to GitHub

```bash
git init -b main
git add .
git commit -m "vortex script hub"
gh repo create vortex-script-hub --public --source=. --push
```

---

## Notes

- Raw responses are `Cache-Control: no-store` and `Access-Control-Allow-Origin: *` so any executor can fetch them.
- Upload rate limit: 12 uploads / IP / hour. Tune in `server.js` `limited()`.
- No accounts. The delete key is the only ownership proof — store it safely.
