/**
 * Base registry — a typed key-value store for node type definitions.
 * Extend this to create domain-specific registries (visual, topology, schema, etc.).
 */
export class Registry<T> {
  readonly #map: Map<string, T> = new Map();
  readonly #name: string;

  constructor(name = 'Registry') {
    this.#name = name;
  }

  register(key: string, definition: T): void {
    this.#map.set(key, definition);
  }

  get(key: string): T {
    if (!this.#map.has(key)) {
      throw new Error(`${this.#name}: unknown key "${key}"`);
    }
    return this.#map.get(key) as T;
  }

  has(key: string): boolean {
    return this.#map.has(key);
  }

  getAll(): IterableIterator<[string, T]> {
    return this.#map.entries();
  }

  keys(): IterableIterator<string> {
    return this.#map.keys();
  }

  get size(): number {
    return this.#map.size;
  }
}
