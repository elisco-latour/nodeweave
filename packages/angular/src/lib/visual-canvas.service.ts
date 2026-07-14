import { Injectable, signal, computed, type Signal, type OnDestroy } from '@angular/core';
import {
  CanvasState,
  Node,
  Edge,
  screenToFlowPosition,
  flowToScreenPosition,
  type Point,
} from '@build744/core/core';
import { VisualRegistry, TopologyRegistry, SchemaRegistry } from '@build744/core/registries';

type Viewport = CanvasState['viewport'];
type CanvasJSON = ReturnType<CanvasState['toJSON']>;

/**
 * VisualCanvasService — a signal-first Angular wrapper around the framework
 * agnostic CanvasState.
 *
 * State is exposed as Angular Signals (the primary, recommended surface).
 * All mutations delegate to the underlying CanvasState so there is a single
 * source of truth; the signals are kept in sync from its events.
 *
 * Provide it at the component that hosts <nodeweave> (the component does
 * this for you) and inject it wherever you need to read or mutate the graph.
 */
@Injectable()
export class VisualCanvasService implements OnDestroy {
  /** The underlying framework-agnostic engine. Escape hatch for advanced use. */
  readonly state = new CanvasState();

  readonly visualRegistry = new VisualRegistry();
  readonly topologyRegistry = new TopologyRegistry();
  readonly schemaRegistry = new SchemaRegistry();

  // ── Signals (primary API) ────────────────────────────────────────────────
  readonly #nodes = signal<readonly Node[]>([]);
  readonly #edges = signal<readonly Edge[]>([]);
  readonly #selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly #viewport = signal<Viewport>({ panX: 0, panY: 0, zoom: 1 });

  readonly nodes: Signal<readonly Node[]> = this.#nodes.asReadonly();
  readonly edges: Signal<readonly Edge[]> = this.#edges.asReadonly();
  readonly selectedIds: Signal<ReadonlySet<string>> = this.#selectedIds.asReadonly();
  readonly viewport: Signal<Viewport> = this.#viewport.asReadonly();

  readonly selectedNodes = computed(() =>
    this.#nodes().filter((n) => this.#selectedIds().has(n.id)),
  );

  readonly #canUndo = signal(false);
  readonly #canRedo = signal(false);
  readonly canUndo: Signal<boolean> = this.#canUndo.asReadonly();
  readonly canRedo: Signal<boolean> = this.#canRedo.asReadonly();

  /**
   * Bumped whenever a node's config changes. Node components mutate in place,
   * so read this in a computed to re-derive config-dependent view state:
   * `computed(() => (svc.configTick(), node().metadata.config))`.
   */
  readonly #configTick = signal(0);
  readonly configTick: Signal<number> = this.#configTick.asReadonly();

  /** The untransformed surface element, registered by the host component. */
  #surface: HTMLElement | null = null;

  readonly #teardown: Array<() => void> = [];

  constructor() {
    const onNodes = () => { this.#syncNodes(); this.#syncHistory(); };
    const onEdges = () => { this.#syncEdges(); this.#syncHistory(); };
    const onSelection = (e: Event) => {
      this.#selectedIds.set(new Set((e as CustomEvent).detail.selectedIds as Set<string>));
    };
    const onViewport = (e: Event) => {
      const d = (e as CustomEvent).detail;
      this.#viewport.set({ panX: d.panX, panY: d.panY, zoom: d.zoom });
    };
    const onReset = () => {
      this.#syncNodes();
      this.#syncEdges();
      this.#selectedIds.set(new Set(this.state.selectedNodeIds));
      this.#viewport.set({ ...this.state.viewport });
      this.#syncHistory();
    };

    const onConfig = () => {
      this.#syncNodes();
      this.#configTick.update((v) => v + 1);
      this.#syncHistory();
    };

    this.#on('node-added', onNodes);
    this.#on('node-removed', onNodes);
    this.#on('node-moved', onNodes);
    this.#on('node-resized', onNodes);
    this.#on('node-config-updated', onConfig);
    this.#on('edge-added', onEdges);
    this.#on('edge-removed', onEdges);
    this.#on('selection-changed', onSelection);
    this.#on('viewport-changed', onViewport);
    this.#on('state-reset', onReset);
  }

  /** @internal — wired up by VisualCanvasComponent so coordinate helpers work. */
  registerSurface(el: HTMLElement | null): void {
    this.#surface = el;
  }

  #on(type: string, listener: EventListener): void {
    this.state.addEventListener(type, listener);
    this.#teardown.push(() => this.state.removeEventListener(type, listener));
  }

  #syncNodes(): void { this.#nodes.set([...this.state.nodes.values()]); }
  #syncEdges(): void { this.#edges.set([...this.state.edges.values()]); }
  #syncHistory(): void {
    this.#canUndo.set(this.state.commandHistory.canUndo);
    this.#canRedo.set(this.state.commandHistory.canRedo);
  }

  // ── Mutations (delegate to the engine) ────────────────────────────────────
  addNode(node: Node): void { this.state.addNode(node); }
  removeNode(nodeId: string): void { this.state.removeNode(nodeId); }
  addEdge(edge: Edge): void { this.state.addEdge(edge); }
  removeEdge(edgeId: string): void { this.state.removeEdge(edgeId); }

  selectNode(nodeId: string): void { this.state.selectNode(nodeId); }
  clearSelection(): void { this.state.clearSelection(); }

  /**
   * Merge a partial config patch into a node's `metadata.config` (undoable).
   * Emits `node-config-updated`, which bumps {@link configTick}.
   */
  updateNodeConfig(nodeId: string, patch: Record<string, unknown>): void {
    const current = this.state.nodes.get(nodeId)?.metadata.config ?? {};
    this.state.updateNodeConfig(nodeId, { ...current, ...patch });
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────
  /** Screen/client point → flow (canvas) coordinates. For palette drops. */
  screenToFlowPosition(point: Point): Point {
    return screenToFlowPosition(point, this.state.viewport, this.#rect());
  }

  /** Flow (canvas) point → screen coordinates. For anchoring overlays to nodes. */
  flowToScreenPosition(point: Point): Point {
    return flowToScreenPosition(point, this.state.viewport, this.#rect());
  }

  #rect(): { left: number; top: number } {
    const r = this.#surface?.getBoundingClientRect();
    return { left: r?.left ?? 0, top: r?.top ?? 0 };
  }

  undo(): void { this.state.commandHistory.undo(); this.#refresh(); }
  redo(): void { this.state.commandHistory.redo(); this.#refresh(); }

  clear(): void { this.state.clear(); }
  toJSON(): CanvasJSON { return this.state.toJSON(); }
  loadFromJSON(json: CanvasJSON): void { this.state.loadFromJSON(json); }

  #refresh(): void {
    this.#syncNodes();
    this.#syncEdges();
    this.#syncHistory();
  }

  ngOnDestroy(): void {
    for (const off of this.#teardown) off();
    this.#teardown.length = 0;
  }
}
