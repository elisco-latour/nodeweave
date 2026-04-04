const KEY_PREFIX = 'pipeline:';

export class StorageService {
  save(name, canvasState) {
    const data = canvasState.toJSON();
    data.savedAt = Date.now();
    const json = JSON.stringify(data);
    try {
      localStorage.setItem(`${KEY_PREFIX}${name}`, json);
    } catch (err) {
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        throw new Error(`Storage quota exceeded while saving pipeline "${name}".`);
      }
      throw err;
    }
  }

  load(name) {
    const raw = localStorage.getItem(`${KEY_PREFIX}${name}`);
    if (raw === null) return null;
    return JSON.parse(raw);
  }

  list() {
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(KEY_PREFIX)) {
        names.push(key.slice(KEY_PREFIX.length));
      }
    }
    return names;
  }

  delete(name) {
    localStorage.removeItem(`${KEY_PREFIX}${name}`);
  }
}
