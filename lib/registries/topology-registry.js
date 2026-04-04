export class TopologyRegistry {
  #map = new Map();

  register(nodeType, topologyDef) {
    this.#map.set(nodeType, topologyDef);
  }

  get(nodeType) {
    if (!this.#map.has(nodeType)) {
      throw new Error(`TopologyRegistry: unknown node type "${nodeType}"`);
    }
    return this.#map.get(nodeType);
  }

  has(nodeType) {
    return this.#map.has(nodeType);
  }
}
