// Depends on Howler.js being available as window.Howl (loaded via CDN in index.html)

// ── Noise generator (Web Audio API — no external URLs) ───────────────────────

class NoiseTrack {
  constructor(label, type) {
    this.label   = label;
    this.playing = false;
    this._type   = type;  // 'white' | 'brown' | 'pink'
    this._ctx    = null;
    this._gain   = null;
    this._source = null;
    this._vol    = 0.3;
  }

  _init() {
    if (this._ctx) return;
    this._ctx  = new AudioContext();
    this._gain = this._ctx.createGain();
    this._gain.gain.value = this._vol;
    this._gain.connect(this._ctx.destination);
  }

  _makeBuffer() {
    const sr  = this._ctx.sampleRate;
    const buf = this._ctx.createBuffer(1, sr * 2, sr);
    const d   = buf.getChannelData(0);

    if (this._type === 'white') {
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    } else if (this._type === 'brown') {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        d[i] = (last + 0.02 * w) / 1.02;
        last = d[i];
        d[i] *= 3.5;
      }

    } else { // pink — Paul Kellet's algorithm
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
        d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
        b6   = w * 0.115926;
      }
    }
    return buf;
  }

  play() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    try { if (this._source) this._source.stop(); } catch (_) {}
    this._source        = this._ctx.createBufferSource();
    this._source.buffer = this._makeBuffer();
    this._source.loop   = true;
    this._source.connect(this._gain);
    this._source.start();
    this.playing = true;
  }

  pause() {
    try { if (this._source) this._source.stop(); } catch (_) {}
    this._source = null;
    this.playing = false;
  }

  setVolume(v) {
    this._vol = v;
    if (this._gain) this._gain.gain.value = v;
  }
}

// ── URL-based track (Howler.js) ───────────────────────────────────────────────

class HowlTrack {
  constructor(label, url) {
    this.label   = label;
    this.playing = false;
    this._howl   = new Howl({ src: [url], loop: true, volume: 0.5, html5: true });
  }
  play()          { this._howl.play();  this.playing = true;  }
  pause()         { this._howl.pause(); this.playing = false; }
  setVolume(v)    { this._howl.volume(v); }
  unload()        { this._howl.unload(); }
}

// ── Track collections ─────────────────────────────────────────────────────────

// Built-in noise generators — always present, survive space changes
const BUILT_IN = [
  new NoiseTrack('White Noise', 'white'),
  new NoiseTrack('Brown Noise', 'brown'),
  new NoiseTrack('Pink Noise',  'pink'),
];

let urlTracks = []; // HowlTrack[] — replaced when a new space is selected

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns all tracks: built-in noise generators first, then space-specific URL tracks. */
export function getAllTracks() {
  return [...BUILT_IN, ...urlTracks];
}

/** Replace URL-based tracks with those from the selected space. Built-in tracks are unchanged. */
export function loadSounds(ambientSounds) {
  urlTracks.forEach(t => { t.pause(); t.unload(); });
  urlTracks = [];

  (ambientSounds || []).forEach(({ label, url }) => {
    if (!url) return;
    urlTracks.push(new HowlTrack(label || 'Ambient', url));
  });
}

export function toggleTrack(index) {
  const track = getAllTracks()[index];
  if (!track) return;
  track.playing ? track.pause() : track.play();
}

export function setTrackVolume(index, volume) {
  const track = getAllTracks()[index];
  if (track) track.setVolume(volume);
}

export function stopAll() {
  getAllTracks().forEach(t => { if (t.playing) t.pause(); });
}
