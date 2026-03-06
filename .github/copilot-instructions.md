# StudySpace – Copilot Instructions

StudySpace is an aesthetic productivity dashboard (LifeAt-style) built with a **zero-framework, low-cost** stack:

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (ES Modules) | GitHub Pages (`/docs` folder or `gh-pages` branch) |
| API Gateway | Cloudflare Workers + KV | `api.studyspace.*` worker route |
| Backend / CMS | Google Apps Script (`doGet`) + Google Sheets | `script.google.com` |

---

## Architecture

### Frontend (`/src` or root `index.html`)
- Single HTML file with modular JS (`<script type="module">`).
- **Video layer:** YouTube IFrame Player API embedded in a `div` with `z-index: -1`. Videos autoplay **muted**; audio only unmutes after explicit user interaction.
- **Audio mixer:** [Howler.js](https://howlerjs.com/) manages multiple concurrent ambient tracks (rain, cafe, etc.) each with their own volume slider.
- **Pomodoro timer:** Never use `setInterval` for countdown logic. Store `endTime = Date.now() + durationMs`, then calculate remaining time each `requestAnimationFrame` tick.
- **Spaces catalog:** Loaded at runtime from the Cloudflare Worker endpoint (`/spaces`). Shape: `{ id, name, youtubeId, ambientSounds: [{ url, label }], category }`.

### Cloudflare Worker (`/worker/index.js`)
- Acts as a reverse proxy / cache in front of Google Apps Script.
- Checks **Cloudflare KV** for a cached response before forwarding to GAS.
- Adds `Access-Control-Allow-Origin: *` and `Content-Type: application/json` headers on every response.
- Handles CORS preflight (`OPTIONS`) requests.
- Environment variable `GAS_URL` holds the deployed Apps Script URL.

### Google Apps Script (`/gas/Code.gs`)
- `doGet(e)` returns the Spaces sheet as JSON: `ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)`.
- **Sheet 1 – Spaces:** `SpaceID | YouTubeID | AmbientSoundURLs (comma-sep) | Category | Name`
- **Sheet 2 – Stats:** append-only log of Pomodoro completions or feedback.
- Deploy as "Execute as Me, Anyone (even anonymous)" to allow unauthenticated GAS reads.

---

## Commands

```bash
npm install              # Install Wrangler + clasp and all dev dependencies
npm run dev              # wrangler dev — run the Worker locally on localhost:8787
npm run deploy           # wrangler deploy — publish the Worker to Cloudflare
npm run dev:frontend     # npx serve . — serve the static frontend locally (or open index.html directly)
npm run gas:login        # clasp login — authenticate with Google
npm run gas:push         # clasp push --rootDir gas — upload local .gs files to Apps Script
npm run gas:deploy       # clasp deploy --rootDir gas — create a new versioned deployment
```

> The frontend has no build step. `index.html` can be opened directly in a browser or served with any static file server.

---

## Key Conventions

- **No build step** on the frontend. ES Modules are used directly in the browser; no bundler unless one is explicitly added later.
- **GitHub Pages deployment** is triggered by pushing to the `gh-pages` branch, or by serving from `/docs` on `main` — whichever is configured in repo Settings → Pages.
- **CORS must be handled at two places:** the Cloudflare Worker response headers *and* the GAS `doGet` response headers.
- **YouTube autoplay policy:** always initialise the player with `mute: 1` (or `mute=1` in the query string). Provide an explicit "unmute" button; never assume audio will play automatically.
- **Timer drift prevention:** all timer state is stored as an absolute `endTime` timestamp, not a countdown counter.
- **Spaces data is read-only from the client.** Any writes (stats, feedback) go through the Cloudflare Worker → GAS to keep the Sheets API key server-side.

---

## File Layout (intended)

```
studyspace/
├── index.html          # Entry point served by GitHub Pages
├── css/
│   └── style.css
├── js/
│   ├── main.js         # App bootstrap, YouTube API init
│   ├── timer.js        # Pomodoro logic (endTime-based)
│   ├── audio.js        # Howler.js mixer
│   └── spaces.js       # Fetch + render spaces from Worker API
├── worker/
│   └── index.js        # Cloudflare Worker source
├── gas/
│   └── Code.gs         # Google Apps Script source
└── .github/
    └── copilot-instructions.md
```

---

## External APIs

| API | Docs | Notes |
|---|---|---|
| YouTube IFrame Player API | https://developers.google.com/youtube/iframe_api_reference | Load via `https://www.youtube.com/iframe_api`; use `YT.Player` constructor |
| Howler.js | https://howlerjs.com/ | Include via CDN or local copy; use `Howl` with `loop: true` |
| Cloudflare KV | https://developers.cloudflare.com/kv/ | Bind as `SPACES_KV` in `wrangler.toml` |
