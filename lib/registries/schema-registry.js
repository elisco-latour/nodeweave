export class SchemaRegistry {
  #map = new Map();

  register(nodeType, configSchema) {
    this.#map.set(nodeType, configSchema);
  }

  get(nodeType) {
    if (!this.#map.has(nodeType)) {
      throw new Error(`SchemaRegistry: unknown node type "${nodeType}"`);
    }
    return this.#map.get(nodeType);
  }

  has(nodeType) {
    return this.#map.has(nodeType);
  }
}
