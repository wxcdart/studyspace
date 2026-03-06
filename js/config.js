// Cloudflare Worker URL — replace before deploying
export const WORKER_URL = "https://studyspace-worker.YOUR_SUBDOMAIN.workers.dev";

// Timer durations in milliseconds
export const TIMER_DURATIONS = {
  focus:      25 * 60 * 1000,
  shortBreak:  5 * 60 * 1000,
  longBreak:  15 * 60 * 1000,
};

// Used when the Worker / network is unavailable
export const FALLBACK_SPACES = [
  {
    id: "lofi-chill",
    name: "Lofi Chill",
    youtubeId: "jfKfPfyJRdk",
    category: "Lofi",
    ambientSounds: [],
  },
];
