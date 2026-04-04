/**
 * <wf-shell> — Wireframe orchestrator.
 *
 * Wires workspace, palette, toolbar, process-list, config-drawer, and
 * context menu together. Owns CanvasState, registries, controllers.
 * Keeps the wireframe's floating-pill, light-theme layout.
 */

import {
  CanvasState,
  Node,
  Port,
  Edge,
} from '../../lib/core.js';
import {
  DragController,
  PanZoomController,
  SelectionController,
  EdgeRoutingController,
  KeyboardController,
} from '../../lib/controllers.js';
import {
  WfVisualRegistry,
  WfTopologyRegistry,
  WfSchemaRegistry,
  registerWireframeNodes,
} from '../registries.js';
import { StorageService } from '../services/storage-service.js';
import './wf-workspace.js';
import './wf-palette.js';
import './wf-toolbar.js';
import './wf-process-list.js';
import './wf-config-drawer.js';

const SELECTORS = { node: 'wf-node', port: '[data-port]' };

let nodeCounter = 0;

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }

  wf-workspace {
    display: block;
    width: 100%;
    height: 100%;
  }

  .palette-bar {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
  }

  .process-panel {
    position: fixed;
    top: 24px;
    left: 24px;
    z-index: 50;
  }

  .toolbar-bar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
  }

  wf-config-drawer {
    z-index: 100;
  }

  .context-menu {
    position: fixed;
    z-index: 200;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 4px 0;
    min-width: 140px;
    font-size: 13px;
    color: #0f172a;
  }
  .context-menu[hidden] { display: none; }

  .context-menu button {
    display: block;
    width: 100%;
    padding: 8px 14px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    transition: background 0.1s;
  }
  .context-menu button:hover {
    background: #f1f5f9;
  }
  .context-menu button.danger:hover {
    background: #fef2f2;
    color: #dc2626;
  }
</style>

<wf-workspace id="workspace"></wf-workspace>

<div class="palette-bar">
  <wf-palette id="palette"></wf-palette>
</div>

<div class="process-panel">
  <wf-process-list id="process-list"></wf-process-list>
</div>

<div class="toolbar-bar">
  <wf-toolbar id="toolbar"></wf-toolbar>
</div>

<wf-config-drawer id="drawer"></wf-config-drawer>

<div id="context-menu" class="context-menu" hidden>
  <button id="ctx-duplicate">Duplicate</button>
  <button id="ctx-delete" class="danger">Delete</button>
</div>
`;

export class WfShell extends HTMLElement {
  #state;
  #visualRegistry;
  #topologyRegistry;
  #schemaRegistry;
  #storageService;
  #controllers = {};
  #autoSaveTimer = null;
  #contextMenuNodeId = null;

  #onSelectionChanged;
  #onConfigUpdated;
  #onStateChanged;
  #onStateReset;
  #onDocClick;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.#state = new CanvasState();
    this.#visualRegistry = new WfVisualRegistry();
    this.#topologyRegistry = new WfTopologyRegistry();
    this.#schemaRegistry = new WfSchemaRegistry();
    this.#storageService = new StorageService();
    registerWireframeNodes(this.#visualRegistry, this.#topologyRegistry, this.#schemaRegistry);

    this.#onSelectionChanged = (e) => this.#handleSelectionChanged(e);
    this.#onConfigUpdated = (e) => this.#handleConfigUpdated(e);
    this.#onStateChanged = () => this.#scheduleAutoSave();
    this.#onStateReset = () => {
      this.#reattachControllers();
      this.#scheduleAutoSave();
    };
    this.#onDocClick = () => this.#hideContextMenu();
  }

  connectedCallback() {
    const workspace = this.shadowRoot.getElementById('workspace');
    const palette = this.shadowRoot.getElementById('palette');
    const toolbar = this.shadowRoot.getElementById('toolbar');
    const processList = this.shadowRoot.getElementById('process-list');
    const drawer = this.shadowRoot.getElementById('drawer');

    // Wire registries and state to children
    workspace.visualRegistry = this.#visualRegistry;
    workspace.topologyRegistry = this.#topologyRegistry;
    workspace.state = this.#state;

    palette.visualRegistry = this.#visualRegistry;

    toolbar.state = this.#state;

    processList.storageService = this.#storageService;
    processList.state = this.#state;

    // Expose state for E2E test access
    window.__state = this.#state;

    // Attach controllers
    this.#attachControllers(workspace);

    // Selection → config drawer + aria-selected
    this.#state.addEventListener('selection-changed', this.#onSelectionChanged);

    // Config drawer → state
    drawer.addEventListener('node-config-updated', this.#onConfigUpdated);

    // Auto-save wiring
    this.#state.addEventListener('node-added', this.#onStateChanged);
    this.#state.addEventListener('node-removed', this.#onStateChanged);
    this.#state.addEventListener('node-moved', this.#onStateChanged);
    this.#state.addEventListener('edge-added', this.#onStateChanged);
    this.#state.addEventListener('edge-removed', this.#onStateChanged);
    this.#state.addEventListener('node-config-updated', this.#onStateChanged);
    this.#state.addEventListener('state-reset', this.#onStateReset);

    // Palette drag-and-drop
    workspace.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('application/x-node-type')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    workspace.addEventListener('drop', (e) => {
      const nodeType = e.dataTransfer.getData('application/x-node-type');
      if (!nodeType) return;
      e.preventDefault();
      const rect = workspace.getBoundingClientRect();
      const { panX, panY, zoom } = this.#state.viewport;
      const canvasX = (e.clientX - rect.left - panX) / zoom;
      const canvasY = (e.clientY - rect.top - panY) / zoom;
      this.#addNodeToCanvas(nodeType, canvasX, canvasY);
    });

    // Palette keyboard add (Enter)
    this.addEventListener('palette-add-node', (e) => {
      const { nodeType } = e.detail;
      const rect = workspace.getBoundingClientRect();
      const { panX, panY, zoom } = this.#state.viewport;
      const centerX = (rect.width / 2 - panX) / zoom;
      const centerY = (rect.height / 2 - panY) / zoom;
      this.#addNodeToCanvas(nodeType, centerX, centerY);
    });

    // Toolbar events
    this.addEventListener('toolbar-delete-selected', () => {
      for (const nodeId of this.#state.selectedNodeIds) {
        this.#state.removeNode(nodeId);
      }
    });

    this.addEventListener('toolbar-fit-view', () => {
      this.#fitToView(workspace);
    });

    // Context menu events from wf-node ⋮ button
    this.addEventListener('node-context-menu', (e) => {
      this.#showContextMenu(e.detail.nodeId, e.detail.clientX, e.detail.clientY);
    });

    this.shadowRoot.getElementById('ctx-duplicate').addEventListener('click', () => {
      this.#duplicateNode(this.#contextMenuNodeId);
      this.#hideContextMenu();
    });

    this.shadowRoot.getElementById('ctx-delete').addEventListener('click', () => {
      if (this.#contextMenuNodeId) {
        this.#state.removeNode(this.#contextMenuNodeId);
      }
      this.#hideContextMenu();
    });

    document.addEventListener('click', this.#onDocClick);

    // Fit to view on first load (after nodes render)
    queueMicrotask(() => {
      if (this.#state.nodes.size > 0) {
        this.#fitToView(workspace);
      }
    });
  }

  disconnectedCallback() {
    this.#state.removeEventListener('selection-changed', this.#onSelectionChanged);
    this.#state.removeEventListener('node-added', this.#onStateChanged);
    this.#state.removeEventListener('node-removed', this.#onStateChanged);
    this.#state.removeEventListener('node-moved', this.#onStateChanged);
    this.#state.removeEventListener('edge-added', this.#onStateChanged);
    this.#state.removeEventListener('edge-removed', this.#onStateChanged);
    this.#state.removeEventListener('node-config-updated', this.#onStateChanged);
    this.#state.removeEventListener('state-reset', this.#onStateReset);

    const drawer = this.shadowRoot.getElementById('drawer');
    if (drawer) drawer.removeEventListener('node-config-updated', this.#onConfigUpdated);

    document.removeEventListener('click', this.#onDocClick);

    for (const c of Object.values(this.#controllers)) {
      if (c.detach) c.detach();
    }
    if (this.#autoSaveTimer) clearTimeout(this.#autoSaveTimer);
  }

  // ─── Controllers ──────────────────────────────────────────────────────

  #attachControllers(workspace) {
    const edgeLayer = workspace.shadowRoot.querySelector('wf-edge-layer');
    this.#controllers = {
      drag: new DragController(workspace, this.#state, SELECTORS),
      panZoom: new PanZoomController(workspace, this.#state),
      selection: new SelectionController(workspace, this.#state, SELECTORS),
      edgeRouting: new EdgeRoutingController(workspace, this.#state, edgeLayer, SELECTORS),
      keyboard: new KeyboardController(workspace, this.#state, SELECTORS),
    };
    for (const c of Object.values(this.#controllers)) c.attach();
  }

  #reattachControllers() {
    const workspace = this.shadowRoot.getElementById('workspace');
    for (const c of Object.values(this.#controllers)) {
      if (c.detach) c.detach();
    }
    queueMicrotask(() => this.#attachControllers(workspace));
  }

  // ─── Add node ─────────────────────────────────────────────────────────

  #addNodeToCanvas(nodeType, x, y) {
    const id = `wf-${nodeType}-${++nodeCounter}-${Date.now()}`;
    const node = new Node({ id, type: nodeType, x, y, metadata: { config: {} } });

    if (this.#topologyRegistry.has(nodeType)) {
      const topo = this.#topologyRegistry.get(nodeType);
      for (const def of topo.inputs) {
        node.addPort(new Port({ id: `${id}:${def.id}`, direction: 'in', nodeId: id, positionHint: def.position }));
      }
      for (const def of topo.outputs) {
        node.addPort(new Port({ id: `${id}:${def.id}`, direction: 'out', nodeId: id, positionHint: def.position }));
      }
      const rows = Math.max(topo.inputs.length, topo.outputs.length);
      node.width = 280;
      node.height = 45 + 12 + rows * 24 + Math.max(0, rows - 1) * 8 + 12;
    }

    if (this.#schemaRegistry.has(nodeType)) {
      const schema = this.#schemaRegistry.get(nodeType);
      const defaultConfig = {};
      for (const field of schema.fields) {
        if (field.default !== undefined) {
          defaultConfig[field.id] = field.default;
        }
      }
      node.metadata.config = defaultConfig;
    }

    this.#state.addNode(node);
  }

  // ─── Selection → drawer + styling ─────────────────────────────────────

  #handleSelectionChanged(e) {
    const selectedIds = e.detail.selectedIds;
    const drawer = this.shadowRoot.getElementById('drawer');
    const workspace = this.shadowRoot.getElementById('workspace');

    // Update aria-selected on wf-node elements
    const nodes = workspace.shadowRoot
      ? workspace.shadowRoot.querySelectorAll(SELECTORS.node)
      : [];
    for (const el of nodes) {
      if (selectedIds.has(el.nodeId)) {
        el.setAttribute('aria-selected', 'true');
      } else {
        el.removeAttribute('aria-selected');
      }
    }

    // Open/close config drawer
    if (selectedIds.size === 1) {
      const nodeId = selectedIds.values().next().value;
      const node = this.#state.nodes.get(nodeId);
      if (node) {
        const nodeType = node.type;
        const visual = this.#visualRegistry.has(nodeType)
          ? this.#visualRegistry.get(nodeType) : null;
        const label = visual ? visual.label : nodeType;
        drawer.open(nodeId, label);

        if (this.#schemaRegistry.has(nodeType)) {
          const regSchema = this.#schemaRegistry.get(nodeType);
          const fieldsObj = {};
          for (const field of regSchema.fields) {
            const { id, ...rest } = field;
            fieldsObj[id] = rest;
          }
          drawer.renderForm({ fields: fieldsObj }, node.metadata.config || {});
        }
      }
    } else {
      drawer.close();
    }
  }

  #handleConfigUpdated(e) {
    const { nodeId, config } = e.detail;
    if (nodeId && config) {
      this.#state.updateNodeConfig(nodeId, config);
    }
  }

  // ─── Context menu ─────────────────────────────────────────────────────

  #showContextMenu(nodeId, clientX, clientY) {
    this.#contextMenuNodeId = nodeId;
    const menu = this.shadowRoot.getElementById('context-menu');
    menu.hidden = false;
    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
  }

  #hideContextMenu() {
    const menu = this.shadowRoot.getElementById('context-menu');
    menu.hidden = true;
    this.#contextMenuNodeId = null;
  }

  #duplicateNode(nodeId) {
    if (!nodeId) return;
    const orig = this.#state.nodes.get(nodeId);
    if (!orig) return;
    this.#addNodeToCanvas(orig.type, orig.x + 40, orig.y + 40);
  }

  // ─── Auto-save ────────────────────────────────────────────────────────

  #scheduleAutoSave() {
    if (this.#autoSaveTimer) clearTimeout(this.#autoSaveTimer);
    this.#autoSaveTimer = setTimeout(() => {
      if (this.#state.nodes.size > 0) {
        this.#storageService.save('__wf_autosave', this.#state.toJSON());
      }
    }, 2000);
  }

  // ─── Fit to view ──────────────────────────────────────────────────────

  #fitToView(workspace) {
    if (this.#state.nodes.size === 0) return;
    const rect = workspace.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this.#state.nodes.values()) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + (node.width || 280));
      maxY = Math.max(maxY, node.y + (node.height || 120));
    }
    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const padding = 60;
    const scaleX = (rect.width - padding * 2) / graphW;
    const scaleY = (rect.height - padding * 2) / graphH;
    const zoom = Math.min(scaleX, scaleY, 2);
    const panX = (rect.width - graphW * zoom) / 2 - minX * zoom;
    const panY = (rect.height - graphH * zoom) / 2 - minY * zoom;
    this.#state.setViewport(panX, panY, zoom);
  }
}

customElements.define('wf-shell', WfShell);
