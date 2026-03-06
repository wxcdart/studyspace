import { WORKER_URL, FALLBACK_SPACES } from './config.js';

let spaces       = [];
let activeSpaceId = null;

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchSpaces() {
  try {
    const res = await fetch(`${WORKER_URL}/spaces`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    spaces = await res.json();
  } catch (err) {
    console.warn('Could not reach Worker — using fallback spaces.', err);
    spaces = FALLBACK_SPACES;
  }
  return spaces;
}

export function getSpaces()      { return spaces; }
export function getActiveSpaceId() { return activeSpaceId; }

export function setActiveSpace(id) { activeSpaceId = id; }
