# StudySpace

An aesthetic productivity dashboard —  built with vanilla HTML/CSS/JS, hosted on GitHub Pages, with a Cloudflare Workers API gateway and Google Apps Script + Sheets backend.

---

## Features

- 🎬 **YouTube video backgrounds** — looping ambient scenes via the YouTube IFrame API
- 🔊 **Ambient sound mixer** — built-in White / Brown / Pink noise generators (Web Audio API) plus URL-based sounds from the space catalog
- 🎵 **Spotify music player** — embed any Spotify playlist; add, switch, and remove playlists with tab UI (persisted locally)
- ⏱️ **Pomodoro timer** — configurable focus / short break / long break durations, auto-transition mode, session counter, two-tone chime alarm with volume control
- ✅ **To-do list** — CRUD task list persisted in `localStorage`
- 🌐 **Spaces catalog** — switch between curated study scenes; fetched from the Cloudflare Worker (with `config.js` fallback for offline use)
- ⚙️ **Settings panel** — dim slider, custom timer durations, auto-transition toggle, alarm volume
- 🎯 **Focus mode** — press `F` to fade the UI to near-invisible; hover to reveal
- ⛶ **Fullscreen toggle**
- ⌨️ **Keyboard shortcuts** — `Space` start/pause, `R` reset, `F` focus mode, `T` todos, `S` settings, `Esc` close panel

---

## Architecture

```
GitHub Pages (static)          Cloudflare Worker          Google Apps Script
  index.html + JS/CSS   ──▶   /spaces endpoint       ──▶   Sheets CMS / stats DB
  (YouTube, Howler,             KV cache (5 min TTL)        doGet / doPost
   Web Audio, Spotify)          CORS headers
```

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vanilla HTML / CSS / ES Modules | UI, timer, audio, local state |
| API Gateway | Cloudflare Workers + KV | Caches and proxies space catalog |
| Backend | Google Apps Script + Sheets | Space catalog CMS, pomodoro stats |

---

## Project Structure

```
studyspace/
├── index.html              # Single-page app shell
├── css/
│   └── style.css           # All styles (glassmorphism, panels, animations)
├── js/
│   ├── config.js           # WORKER_URL, timer defaults, fallback spaces
│   ├── timer.js            # endTime-based Pomodoro logic
│   ├── audio.js            # NoiseTrack (Web Audio) + HowlTrack (Howler.js)
│   ├── spaces.js           # fetchSpaces() with offline fallback
│   ├── storage.js          # localStorage wrapper + KEYS enum
│   ├── todos.js            # To-do CRUD backed by localStorage
│   └── main.js             # App orchestrator — wires all modules
├── worker/
│   └── index.js            # Cloudflare Worker (KV cache → GAS proxy)
├── gas/
│   ├── Code.gs             # Google Apps Script (doGet / doPost)
│   ├── appsscript.json     # GAS manifest (V8, ANYONE_ANONYMOUS)
│   └── .clasp.json.example # Template — copy to .clasp.json and fill in scriptId
├── wrangler.toml           # Cloudflare Worker config (fill in KV IDs + GAS_URL)
└── package.json            # Wrangler + clasp devDependencies
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A Cloudflare account (free tier is fine)
- A Google account (for Apps Script + Sheets)

### Install dependencies

```bash
npm install
```

### Frontend (local dev)

No build step required. Serve the root with any static server:

```bash
npx serve .
# or
python3 -m http.server
```

Open `http://localhost:3000` (or whichever port). The app falls back to the hardcoded spaces in `config.js` when the Worker URL is not set.

### Cloudflare Worker

1. Fill in `wrangler.toml`:
   - Replace the KV namespace `id` and `preview_id` (create a namespace via `npx wrangler kv:namespace create SPACES_KV`)
   - Set `GAS_URL` to your deployed Apps Script URL
2. Deploy:
   ```bash
   npm run worker:dev    # local dev tunnel
   npm run worker:deploy # production deploy
   ```
3. Copy the deployed Worker URL into `js/config.js` → `WORKER_URL`.

### Google Apps Script (backend CMS)

1. Create a new Google Sheet with two sheets named **Spaces** and **Stats**.
   - **Spaces** columns: `SpaceID | Name | YouTubeID | AmbientSoundURLs | Category`
     - `AmbientSoundURLs` format: `label|url,label|url` (comma-separated, pipe-delimited)
   - **Stats** columns: `Timestamp | SpaceID | DurationSeconds`
2. Login and push:
   ```bash
   npm run gas:login
   # Copy gas/.clasp.json.example → gas/.clasp.json and fill in your scriptId
   npm run gas:push
   npm run gas:deploy
   ```
3. Copy the deployment URL into `wrangler.toml` → `GAS_URL`.

---

## Deployment (GitHub Pages)

Push the repo to GitHub. In **Settings → Pages**, set the source to the `main` branch root (`/`). GitHub Pages will serve `index.html` directly — no build step needed.

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run worker:dev` | Start Wrangler local dev server |
| `npm run worker:deploy` | Deploy Worker to Cloudflare |
| `npm run gas:login` | Authenticate clasp with Google |
| `npm run gas:push` | Push `gas/` to Apps Script |
| `npm run gas:deploy` | Create a new Apps Script deployment |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Start / pause timer |
| `R` | Reset timer |
| `F` | Toggle focus mode |
| `T` | Open to-do list |
| `S` | Open settings |
| `Esc` | Close open panel |
