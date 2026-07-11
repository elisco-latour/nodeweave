/**
 * Minimal localStorage persistence. Stands in for the eventual governed
 * datastore — same idea (durable, keyed), just client-side for now so the
 * product survives a refresh without a backend. Fails safe when storage is
 * unavailable or a payload is corrupt.
 */
const PREFIX = 'runway.';

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable / quota exceeded — non-fatal */
  }
}

export function clearAll(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* no-op */
  }
}
