export class VisualRegistry {
  #map = new Map();

  register(nodeType, visualDef) {
    this.#map.set(nodeType, visualDef);
  }

  get(nodeType) {
    if (!this.#map.has(nodeType)) {
      throw new Error(`VisualRegistry: unknown node type "${nodeType}"`);
    }
    return this.#map.get(nodeType);
  }

  has(nodeType) {
    return this.#map.has(nodeType);
  }

  getAll() {
    return this.#map.entries();
  }
}
