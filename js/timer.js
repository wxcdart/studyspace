import { TIMER_DURATIONS } from './config.js';

let mode            = 'focus';
let running         = false;
let endTime         = null;                        // absolute ms timestamp
let pausedRemaining = TIMER_DURATIONS.focus;       // ms remaining when paused / reset

let onTickCb     = null;
let onCompleteCb = null;

// ── Public API ────────────────────────────────────────────────────────────────

export function initTimer({ onTick, onComplete }) {
  onTickCb     = onTick;
  onCompleteCb = onComplete;
  loop();
}

export function startTimer() {
  if (running) return;
  running = true;
  endTime = Date.now() + pausedRemaining;
}

export function pauseTimer() {
  if (!running) return;
  pausedRemaining = Math.max(0, endTime - Date.now());
  running = false;
  endTime = null;
}

export function resetTimer() {
  running         = false;
  endTime         = null;
  pausedRemaining = TIMER_DURATIONS[mode];
}

export function setTimerMode(newMode) {
  mode = newMode;
  resetTimer();
}

export function isRunning() { return running; }
export function getMode()   { return mode; }

// ── Internal loop (rAF-based, always running) ─────────────────────────────────

function getRemainingMs() {
  if (running && endTime !== null) return Math.max(0, endTime - Date.now());
  return pausedRemaining;
}

function loop() {
  const remaining = getRemainingMs();

  if (onTickCb) onTickCb(remaining);

  if (running && remaining <= 0) {
    running         = false;
    endTime         = null;
    pausedRemaining = TIMER_DURATIONS[mode];
    if (onCompleteCb) onCompleteCb(mode);
  }

  requestAnimationFrame(loop);
}
