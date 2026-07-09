const KEY_PREFIX = 'wf-pipeline:';

export class StorageService {
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

  save(name, json) {
    const data = typeof json === 'string' ? json : JSON.stringify(json);
    try {
      localStorage.setItem(`${KEY_PREFIX}${name}`, data);
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

  remove(name) {
    localStorage.removeItem(`${KEY_PREFIX}${name}`);
  }
}
