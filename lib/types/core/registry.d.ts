/**
 * Base registry — a typed key-value store for node type definitions.
 * Consumers extend this to create domain-specific registries
 * (visual, topology, schema, or anything else).
 * @template T
 */
export class Registry<T> {
    /** @param {string} [name] */
    constructor(name?: string);
    /**
     * @param {string} key
     * @param {T} definition
     */
    register(key: string, definition: T): void;
    /**
     * @param {string} key
     * @returns {T}
     */
    get(key: string): T;
    /** @param {string} key @returns {boolean} */
    has(key: string): boolean;
    /** @returns {IterableIterator<[string, T]>} */
    getAll(): IterableIterator<[string, T]>;
    /** @returns {IterableIterator<string>} */
    keys(): IterableIterator<string>;
    /** @returns {number} */
    get size(): number;
    #private;
}
