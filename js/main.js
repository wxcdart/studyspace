import { initTimer, startTimer, pauseTimer, resetTimer, setTimerMode, isRunning } from './timer.js';
import { loadSounds, getTracks, toggleTrack, setTrackVolume } from './audio.js';
import { fetchSpaces, setActiveSpace, getActiveSpaceId } from './spaces.js';

// ── YouTube ───────────────────────────────────────────────────────────────────

let ytPlayer     = null;
let ytReady      = false;
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
        // Keep looping — loop=1 requires the playlist param; this is more reliable
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
  } else {
    pendingVideoId = youtubeId;
  }
}

// ── Timer UI ──────────────────────────────────────────────────────────────────

const timerDisplay = document.getElementById('timer-display');
const btnStart     = document.getElementById('btn-start');
const btnReset     = document.getElementById('btn-reset');
const modeButtons  = document.querySelectorAll('.mode-btn');
const timerWidget  = document.getElementById('timer-widget');

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

  if (Notification.permission === 'granted') {
    new Notification('StudySpace', {
      body: completedMode === 'focus'
        ? '✅ Focus session done — take a break!'
        : '⏱ Break over — back to work!',
    });
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

// ── Clock ─────────────────────────────────────────────────────────────────────

const clockEl = document.getElementById('clock');

function tickClock() {
  clockEl.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
  requestAnimationFrame(tickClock);
}

// ── Panels ────────────────────────────────────────────────────────────────────

const spacesPanel   = document.getElementById('spaces-panel');
const soundsPanel   = document.getElementById('sounds-panel');
const panelBackdrop = document.getElementById('panel-backdrop');

function openPanel(panel) {
  panel.classList.remove('hidden');
  panelBackdrop.classList.remove('hidden');
}

function closeAllPanels() {
  spacesPanel.classList.add('hidden');
  soundsPanel.classList.add('hidden');
  panelBackdrop.classList.add('hidden');
}

document.getElementById('btn-spaces').addEventListener('click', () => openPanel(spacesPanel));
document.getElementById('btn-sounds').addEventListener('click', () => openPanel(soundsPanel));
document.getElementById('btn-close-spaces').addEventListener('click', closeAllPanels);
document.getElementById('btn-close-sounds').addEventListener('click', closeAllPanels);
panelBackdrop.addEventListener('click', closeAllPanels);

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllPanels(); });

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

    const thumb = `https://img.youtube.com/vi/${space.youtubeId}/mqdefault.jpg`;
    card.innerHTML = `
      <img src="${thumb}" alt="${space.name}" loading="lazy" />
      <div class="space-card-label">${space.name}</div>
    `;

    card.addEventListener('click', () => selectSpace(space));
    spacesGrid.appendChild(card);
  });
}

function selectSpace(space) {
  setActiveSpace(space.id);
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
  const tracks = getTracks();

  if (!tracks.length) {
    soundsList.innerHTML = '<p class="no-sounds-msg">No ambient sounds for this space.</p>';
    return;
  }

  soundsList.innerHTML = tracks.map((track, i) => `
    <div class="sound-track">
      <div class="sound-track-header">
        <span class="sound-track-label">${track.label || `Track ${i + 1}`}</span>
        <button class="sound-toggle${track.playing ? ' on' : ''}" data-index="${i}" aria-label="Toggle ${track.label}"></button>
      </div>
      <input
        type="range" class="volume-slider"
        data-index="${i}" min="0" max="1" step="0.01" value="0.5"
        aria-label="${track.label} volume"
      />
    </div>
  `).join('');
}

// Delegated listeners on soundsList — set up once, survive re-renders
soundsList.addEventListener('click', e => {
  const btn = e.target.closest('.sound-toggle');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  toggleTrack(index);
  btn.classList.toggle('on', getTracks()[index].playing);
});

soundsList.addEventListener('input', e => {
  const slider = e.target.closest('.volume-slider');
  if (!slider) return;
  setTrackVolume(Number(slider.dataset.index), Number(slider.value));
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  loadYouTubeAPI();
  tickClock();
  initTimer({ onTick: onTimerTick, onComplete: onTimerComplete });

  spacesGrid.innerHTML = '<p class="spaces-loading">Loading spaces…</p>';
  const spaces = await fetchSpaces();
  renderSpaces(spaces);

  if (spaces.length) selectSpace(spaces[0]);
}

init();
