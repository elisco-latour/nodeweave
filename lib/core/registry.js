/**
 * Base registry — a typed key-value store for node type definitions.
 * Consumers extend this to create domain-specific registries
 * (visual, topology, schema, or anything else).
 * @template T
 */
export class Registry {
  /** @type {Map<string, T>} */ #map = new Map();
  /** @type {string} */ #name;

  /** @param {string} [name] */
  constructor(name = 'Registry') {
    this.#name = name;
  }

  /**
   * @param {string} key
   * @param {T} definition
   */
  register(key, definition) {
    this.#map.set(key, definition);
  }

  /**
   * @param {string} key
   * @returns {T}
   */
  get(key) {
    if (!this.#map.has(key)) {
      throw new Error(`${this.#name}: unknown key "${key}"`);
    }
    return /** @type {T} */ (this.#map.get(key));
  }

  /** @param {string} key @returns {boolean} */
  has(key) {
    return this.#map.has(key);
  }

  /** @returns {IterableIterator<[string, T]>} */
  getAll() {
    return this.#map.entries();
  }

  /** @returns {IterableIterator<string>} */
  keys() {
    return this.#map.keys();
  }

  /** @returns {number} */
  get size() {
    return this.#map.size;
  }
}
