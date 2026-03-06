const KEY_PREFIX = 'ss:';

export const KEYS = {
  lastSpaceId:    'lastSpaceId',
  dim:            'dim',
  timerDurations: 'timerDurations',
  todos:          'todos',
  sessions:       'sessions',
  autoTransition: 'autoTransition',
  alarmVolume:    'alarmVolume',
};

export function get(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  } catch {}
}
