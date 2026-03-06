import { TIMER_DURATIONS } from './config.js';

let mode            = 'focus';
let running         = false;
let endTime         = null;
let pausedRemaining = TIMER_DURATIONS.focus;

let onTickCb     = null;
let onCompleteCb = null;

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

/** Update durations (from settings) and reset the current mode. */
export function setDurations({ focus, shortBreak, longBreak }) {
  TIMER_DURATIONS.focus      = focus;
  TIMER_DURATIONS.shortBreak = shortBreak;
  TIMER_DURATIONS.longBreak  = longBreak;
  resetTimer();
}

export function isRunning() { return running; }
export function getMode()   { return mode; }

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
