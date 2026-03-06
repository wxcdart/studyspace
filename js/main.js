import { initTimer, startTimer, pauseTimer, resetTimer, setTimerMode, setDurations, isRunning } from './timer.js';
import { loadSounds, getAllTracks, toggleTrack, setTrackVolume } from './audio.js';
import { fetchSpaces, setActiveSpace } from './spaces.js';
import { get, set, KEYS } from './storage.js';
import { getTodos, addTodo, toggleTodo, deleteTodo } from './todos.js';

// ── YouTube ───────────────────────────────────────────────────────────────────

let ytPlayer      = null;
let ytReady       = false;
let pendingVideoId = null;

window.onYouTubeIframeAPIReady = () => {
  ytReady = true;
  ytPlayer = new YT.Player('yt-player', {
    videoId: pendingVideoId || '',
    playerVars: {
      autoplay: 1, mute: 1, controls: 0,
      disablekb: 1, fs: 0, modestbranding: 1,
      playsinline: 1, rel: 0, iv_load_policy: 3,
    },
    events: {
      onReady(e) { e.target.playVideo(); },
      onStateChange(e) {
        if (e.data === YT.PlayerState.ENDED) e.target.playVideo();
      },
    },
  });
};

function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

function loadVideo(youtubeId) {
  if (!youtubeId) return;
  if (ytReady && ytPlayer) {
    ytPlayer.loadVideoById(youtubeId);
    ytPlayer.mute();
    ytMuted = true;
    updateMuteBtn();
  } else {
    pendingVideoId = youtubeId;
  }
}

// ── YouTube mute toggle ───────────────────────────────────────────────────────

let ytMuted = true;
const btnMute = document.getElementById('btn-mute');

function updateMuteBtn() {
  btnMute.textContent = ytMuted ? '🔇' : '🔊';
  btnMute.title = ytMuted ? 'Unmute video' : 'Mute video';
}

btnMute.addEventListener('click', () => {
  if (!ytPlayer) return;
  ytMuted = !ytMuted;
  ytMuted ? ytPlayer.mute() : ytPlayer.unMute();
  updateMuteBtn();
});

// ── Fullscreen ────────────────────────────────────────────────────────────────

const btnFullscreen = document.getElementById('btn-fullscreen');

btnFullscreen.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  btnFullscreen.classList.toggle('active', active);
  btnFullscreen.textContent = active ? '⛶' : '⛶';
});

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

// ── Focus mode ────────────────────────────────────────────────────────────────

let focusMode = false;

function toggleFocusMode() {
  focusMode = !focusMode;
  document.body.classList.toggle('focus-mode', focusMode);
}

// ── Alarm sound (Web Audio API — no external files) ──────────────────────────

function playAlarm(volume = 0.7) {
  if (volume <= 0) return;
  const ctx = new AudioContext();
  // Two-tone chime: 880 Hz then 1100 Hz
  [880, 1100].forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.35;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    osc.start(t);
    osc.stop(t + 1.4);
  });
}

// ── Timer UI ──────────────────────────────────────────────────────────────────

const timerDisplay  = document.getElementById('timer-display');
const btnStart      = document.getElementById('btn-start');
const btnReset      = document.getElementById('btn-reset');
const modeButtons   = document.querySelectorAll('.mode-btn');
const timerWidget   = document.getElementById('timer-widget');
const sessionCountEl = document.getElementById('session-count');

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function onTimerTick(remaining) {
  const formatted = formatTime(remaining);
  timerDisplay.textContent = formatted;
  document.title = `${formatted} — StudySpace`;
}

function onTimerComplete(completedMode) {
  btnStart.textContent = 'Start';
  btnStart.classList.remove('pausing');
  timerWidget.classList.add('timer-complete-ring');
  setTimeout(() => timerWidget.classList.remove('timer-complete-ring'), 3000);

  if (completedMode === 'focus') incrementSessionCount();

  // Alarm
  playAlarm(Number(alarmVolumeSlider.value));

  // Desktop notification
  if (Notification.permission === 'granted') {
    new Notification('StudySpace', {
      body: completedMode === 'focus'
        ? '✅ Focus session done — take a break!'
        : '⏱ Break over — back to work!',
    });
  }

  // Auto-transition to next mode
  if (autoTransitionToggle.checked) {
    const nextMode = completedMode === 'focus'
      ? (getSessionCount() % 4 === 0 ? 'longBreak' : 'shortBreak')
      : 'focus';

    // Update mode button UI
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === nextMode));
    setTimerMode(nextMode);

    // Short delay so the user sees the transition
    setTimeout(() => {
      startTimer();
      btnStart.textContent = 'Pause';
      btnStart.classList.add('pausing');
    }, 1500);
  }
}

btnStart.addEventListener('click', () => {
  if (isRunning()) {
    pauseTimer();
    btnStart.textContent = 'Resume';
    btnStart.classList.remove('pausing');
  } else {
    startTimer();
    btnStart.textContent = 'Pause';
    btnStart.classList.add('pausing');
    if (Notification.permission === 'default') Notification.requestPermission();
  }
});

btnReset.addEventListener('click', () => {
  resetTimer();
  btnStart.textContent = 'Start';
  btnStart.classList.remove('pausing');
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setTimerMode(btn.dataset.mode);
    btnStart.textContent = 'Start';
    btnStart.classList.remove('pausing');
  });
});

// ── Session counter ───────────────────────────────────────────────────────────

function todayKey() { return new Date().toLocaleDateString(); }

function getSessionCount() {
  const sessions = get(KEYS.sessions, {});
  return sessions[todayKey()] ?? 0;
}

function incrementSessionCount() {
  const sessions = get(KEYS.sessions, {});
  sessions[todayKey()] = (sessions[todayKey()] ?? 0) + 1;
  set(KEYS.sessions, sessions);
  sessionCountEl.textContent = sessions[todayKey()];
}

// ── Clock ─────────────────────────────────────────────────────────────────────

const clockEl = document.getElementById('clock');

function tickClock() {
  clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  requestAnimationFrame(tickClock);
}

// ── Panels ────────────────────────────────────────────────────────────────────

const spacesPanel   = document.getElementById('spaces-panel');
const soundsPanel   = document.getElementById('sounds-panel');
const musicPanel    = document.getElementById('music-panel');
const todosPanel    = document.getElementById('todos-panel');
const settingsPanel = document.getElementById('settings-panel');
const panelBackdrop = document.getElementById('panel-backdrop');

const allPanels = [spacesPanel, soundsPanel, musicPanel, todosPanel, settingsPanel];

function openPanel(panel) {
  allPanels.forEach(p => p !== panel && p.classList.add('hidden'));
  panel.classList.remove('hidden');
  panelBackdrop.classList.remove('hidden');
}

function closeAllPanels() {
  allPanels.forEach(p => p.classList.add('hidden'));
  panelBackdrop.classList.add('hidden');
}

document.getElementById('btn-spaces').addEventListener('click',   () => openPanel(spacesPanel));
document.getElementById('btn-sounds').addEventListener('click',   () => { renderSoundsPanel(); openPanel(soundsPanel); });
document.getElementById('btn-music').addEventListener('click',    () => openPanel(musicPanel));
document.getElementById('btn-todos').addEventListener('click',    () => openPanel(todosPanel));
document.getElementById('btn-settings').addEventListener('click', () => openPanel(settingsPanel));
document.getElementById('btn-close-spaces').addEventListener('click',   closeAllPanels);
document.getElementById('btn-close-sounds').addEventListener('click',   closeAllPanels);
document.getElementById('btn-close-music').addEventListener('click',    closeAllPanels);
document.getElementById('btn-close-todos').addEventListener('click',    closeAllPanels);
document.getElementById('btn-close-settings').addEventListener('click', closeAllPanels);
panelBackdrop.addEventListener('click', closeAllPanels);

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Don't fire shortcuts when typing in an input
  if (e.target.matches('input, textarea')) return;

  switch (e.key) {
    case ' ':       e.preventDefault(); btnStart.click(); break;
    case 'r': case 'R': btnReset.click(); break;
    case 'f': case 'F': toggleFocusMode(); break;
    case 't': case 'T': openPanel(todosPanel); break;
    case 's': case 'S': openPanel(soundsPanel); break;
    case 'Escape':
      if (focusMode) { toggleFocusMode(); } else { closeAllPanels(); }
      break;
  }
});

// ── Spaces grid ───────────────────────────────────────────────────────────────

const spacesGrid       = document.getElementById('spaces-grid');
const currentSpaceName = document.getElementById('current-space-name');

function renderSpaces(spaces) {
  if (!spaces.length) {
    spacesGrid.innerHTML = '<p class="spaces-loading">No spaces found.</p>';
    return;
  }
  spacesGrid.innerHTML = '';
  spaces.forEach(space => {
    const card = document.createElement('div');
    card.className = 'space-card';
    card.dataset.id = space.id;
    card.innerHTML = `
      <img src="https://img.youtube.com/vi/${space.youtubeId}/mqdefault.jpg" alt="${space.name}" loading="lazy" />
      <div class="space-card-label">${space.name}</div>
    `;
    card.addEventListener('click', () => selectSpace(space));
    spacesGrid.appendChild(card);
  });
}

function selectSpace(space) {
  setActiveSpace(space.id);
  set(KEYS.lastSpaceId, space.id);
  loadVideo(space.youtubeId);
  loadSounds(space.ambientSounds);
  renderSoundsPanel();
  currentSpaceName.textContent = space.name;
  document.querySelectorAll('.space-card').forEach(c => {
    c.classList.toggle('active', c.dataset.id === space.id);
  });
  closeAllPanels();
}

// ── Sounds panel ──────────────────────────────────────────────────────────────

const soundsList = document.getElementById('sounds-list');

function renderSoundsPanel() {
  const tracks = getAllTracks();
  const builtInCount = 3;
  soundsList.innerHTML = tracks.map((track, i) => `
    ${i === builtInCount && tracks.length > builtInCount ? '<div class="sounds-divider">Space Sounds</div>' : ''}
    <div class="sound-track">
      <div class="sound-track-header">
        <span class="sound-track-label">${track.label}</span>
        <button class="sound-toggle${track.playing ? ' on' : ''}" data-index="${i}" aria-label="Toggle ${track.label}"></button>
      </div>
      <input type="range" class="volume-slider" data-index="${i}" min="0" max="1" step="0.01" value="${track._vol ?? 0.5}" aria-label="${track.label} volume" />
    </div>
  `).join('');
}

soundsList.addEventListener('click', e => {
  const btn = e.target.closest('.sound-toggle');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  toggleTrack(index);
  btn.classList.toggle('on', getAllTracks()[index].playing);
});

soundsList.addEventListener('input', e => {
  const slider = e.target.closest('.volume-slider');
  if (!slider) return;
  setTrackVolume(Number(slider.dataset.index), Number(slider.value));
});

// ── To-do panel ───────────────────────────────────────────────────────────────

const todosList  = document.getElementById('todos-list');
const todoForm   = document.getElementById('todo-form');
const todoInput  = document.getElementById('todo-input');

function renderTodos() {
  const todos = getTodos();
  if (!todos.length) {
    todosList.innerHTML = '<li class="todos-empty">No tasks yet — add one above.</li>';
    return;
  }
  todosList.innerHTML = todos.map(todo => `
    <li class="todo-item${todo.done ? ' done' : ''}" data-id="${todo.id}">
      <input type="checkbox" ${todo.done ? 'checked' : ''} aria-label="Mark done" />
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <button class="btn-delete" aria-label="Delete">✕</button>
    </li>
  `).join('');
}

todoForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;
  addTodo(text);
  todoInput.value = '';
  renderTodos();
});

todosList.addEventListener('change', e => {
  if (!e.target.matches('input[type="checkbox"]')) return;
  const id = Number(e.target.closest('.todo-item').dataset.id);
  toggleTodo(id);
  renderTodos();
});

todosList.addEventListener('click', e => {
  if (!e.target.matches('.btn-delete')) return;
  const id = Number(e.target.closest('.todo-item').dataset.id);
  deleteTodo(id);
  renderTodos();
});

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Settings panel ────────────────────────────────────────────────────────────

const dimSlider          = document.getElementById('dim-slider');
const overlay            = document.getElementById('overlay');
const durFocus           = document.getElementById('dur-focus');
const durShort           = document.getElementById('dur-short');
const durLong            = document.getElementById('dur-long');
const autoTransitionToggle = document.getElementById('auto-transition-toggle');
const alarmVolumeSlider  = document.getElementById('alarm-volume');

function applyDim(value) {
  overlay.style.opacity = value / 100;
}

function applyDurations() {
  const f = Math.max(1, parseInt(durFocus.value)  || 25) * 60 * 1000;
  const s = Math.max(1, parseInt(durShort.value)  ||  5) * 60 * 1000;
  const l = Math.max(1, parseInt(durLong.value)   || 15) * 60 * 1000;
  setDurations({ focus: f, shortBreak: s, longBreak: l });
  set(KEYS.timerDurations, { focus: durFocus.value, shortBreak: durShort.value, longBreak: durLong.value });
  btnStart.textContent = 'Start';
  btnStart.classList.remove('pausing');
}

autoTransitionToggle.addEventListener('change', () => {
  set(KEYS.autoTransition, autoTransitionToggle.checked);
});

alarmVolumeSlider.addEventListener('input', () => {
  set(KEYS.alarmVolume, alarmVolumeSlider.value);
});

dimSlider.addEventListener('input', () => {
  applyDim(dimSlider.value);
  set(KEYS.dim, dimSlider.value);
});

[durFocus, durShort, durLong].forEach(input => {
  input.addEventListener('change', applyDurations);
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  loadYouTubeAPI();
  tickClock();
  initTimer({ onTick: onTimerTick, onComplete: onTimerComplete });

  // Restore persisted settings
  const savedDim = get(KEYS.dim, 45);
  dimSlider.value = savedDim;
  applyDim(savedDim);

  autoTransitionToggle.checked = get(KEYS.autoTransition, false);
  alarmVolumeSlider.value      = get(KEYS.alarmVolume, 0.7);

  const savedDurations = get(KEYS.timerDurations, null);
  if (savedDurations) {
    durFocus.value = savedDurations.focus;
    durShort.value = savedDurations.shortBreak;
    durLong.value  = savedDurations.longBreak;
    applyDurations();
  }

  sessionCountEl.textContent = getSessionCount();

  renderTodos();

  spacesGrid.innerHTML = '<p class="spaces-loading">Loading spaces…</p>';
  const spaces = await fetchSpaces();
  renderSpaces(spaces);

  if (spaces.length) {
    const lastId = get(KEYS.lastSpaceId);
    const toSelect = spaces.find(s => s.id === lastId) || spaces[0];
    selectSpace(toSelect);
  }
}

init();
