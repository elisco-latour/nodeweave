import { Type } from '@angular/core';
import { Node, Port } from '@nodeweave/angular';
import type { SchemaDefinition } from '@nodeweave/angular';

export type PortDir = 'in' | 'out';

/** A named, optionally-labeled port (e.g. a branch outcome on a gate). */
export interface PortSpec {
  /** Suffix for the port id (`${nodeId}:${id}`). */
  id: string;
  direction: PortDir;
  label?: string;
}

/**
 * Declarative description of one node type: what it looks like in the palette,
 * how big it is, which ports it has, what config it carries, and (optionally)
 * which Angular component renders it. The palette, inspector, and node factory
 * are all generated from these — so a new domain is "just a different catalog".
 */
export interface NodeTypeDefinition {
  /** Stable identifier stored on the node (`node.type`). */
  type: string;
  label: string;
  hint?: string;
  /** Short glyph/emoji shown in the palette chip. */
  icon?: string;
  /** CSS colour for the palette chip (any CSS colour). */
  color?: string;
  /** Palette grouping heading. */
  category?: string;
  width?: number;
  height?: number;
  /** Ports to attach. Use `'in'`/`'out'` shorthand, or a {@link PortSpec} for
   *  named/labeled ports (e.g. branch outcomes). */
  ports?: Array<PortDir | PortSpec>;
  /** Per-node resize override (maps to `metadata.resizable`). */
  resizable?: boolean;
  /** Default config values seeded into `metadata.config`. */
  defaults?: Record<string, unknown>;
  /** Drives the schema inspector form for this type. */
  configSchema?: SchemaDefinition;
  /** Custom renderer; when omitted, `<nodeweave>` draws its default node. */
  component?: Type<unknown>;
}

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 90;

export interface CatalogGroup {
  category: string;
  items: NodeTypeDefinition[];
}

/**
 * A registry of {@link NodeTypeDefinition}s. Provides everything the authoring
 * UI needs: palette grouping, the `nodeTypes` map for `<nodeweave>`, per-type
 * config schemas, and a node factory that wires ports + defaults + resizable.
 */
export class NodeCatalog {
  readonly #byType = new Map<string, NodeTypeDefinition>();

  constructor(definitions: NodeTypeDefinition[]) {
    for (const def of definitions) {
      if (this.#byType.has(def.type)) {
        throw new Error(`Duplicate node type in catalog: "${def.type}"`);
      }
      this.#byType.set(def.type, def);
    }
  }

  get(type: string): NodeTypeDefinition | undefined {
    return this.#byType.get(type);
  }

  all(): NodeTypeDefinition[] {
    return [...this.#byType.values()];
  }

  /** Definitions grouped by `category` (preserving first-seen order). */
  byCategory(): CatalogGroup[] {
    const order: string[] = [];
    for (const def of this.all()) {
      const cat = def.category ?? 'Nodes';
      if (!order.includes(cat)) order.push(cat);
    }
    return order.map((category) => ({
      category,
      items: this.all().filter((d) => (d.category ?? 'Nodes') === category),
    }));
  }

  schemaFor(type: string): SchemaDefinition | undefined {
    return this.get(type)?.configSchema;
  }

  /** The `type → component` map to pass to `<nodeweave [nodeTypes]>`. */
  nodeTypes(): Record<string, Type<unknown>> {
    const map: Record<string, Type<unknown>> = {};
    for (const def of this.all()) {
      if (def.component) map[def.type] = def.component;
    }
    return map;
  }

  /** Build a ready-to-add node: ports, default config, size, and resize flag. */
  createNode(
    type: string,
    x: number,
    y: number,
    overrides: Record<string, unknown> = {},
    id = `${type}-${Math.random().toString(36).slice(2, 8)}`,
  ): Node {
    const def = this.get(type);
    if (!def) throw new Error(`Unknown node type: "${type}"`);

    const node = new Node({
      id,
      type,
      x,
      y,
      metadata: {
        config: { ...(def.defaults ?? {}), ...overrides },
        ...(def.resizable !== undefined ? { resizable: def.resizable } : {}),
      },
    });
    node.width = def.width ?? DEFAULT_WIDTH;
    node.height = def.height ?? DEFAULT_HEIGHT;

    for (const p of def.ports ?? []) {
      if (typeof p === 'string') {
        node.addPort(new Port({ id: `${id}:${p}`, direction: p, nodeId: id }));
      } else {
        node.addPort(new Port({ id: `${id}:${p.id}`, direction: p.direction, nodeId: id, label: p.label }));
      }
    }
    return node;
  }
}
