/**
 * Base registry — a typed key-value store for node type definitions.
 * Consumers extend this to create domain-specific registries
 * (visual, topology, schema, or anything else).
 */
export class Registry {
  #map = new Map();
  #name;

  constructor(name = 'Registry') {
    this.#name = name;
  }

  register(key, definition) {
    this.#map.set(key, definition);
  }

  get(key) {
    if (!this.#map.has(key)) {
      throw new Error(`${this.#name}: unknown key "${key}"`);
    }
    return this.#map.get(key);
  }

  has(key) {
    return this.#map.has(key);
  }

  getAll() {
    return this.#map.entries();
  }

  keys() {
    return this.#map.keys();
  }

  get size() {
    return this.#map.size;
  }
}
