import {
  CanvasState,
  Node,
  Port,
  Edge,
  CommandHistory,
  VisualRegistry,
  TopologyRegistry,
  SchemaRegistry,
  DragController,
  PanZoomController,
  SelectionController,
  EdgeRoutingController,
  KeyboardController,
  ResizeController,
} from '../../dist/index.js';

import { registerStarterNodes } from '../starter-nodes.js';
import { StorageService } from '../services/storage-service.js';
import { ExportService } from '../services/export-service.js';
import './component-palette.js';
import './toolbar.js';
import './process-list.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: grid;
    grid-template-columns: 260px 1fr;
    grid-template-rows: 1fr;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg, #1a1a2e);
    font-family: var(--vc-font-family, system-ui, -apple-system, sans-serif);
    color: var(--vc-text-color, #e0e0e0);
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    background: var(--vc-sidebar-bg, #16213e);
    border-right: 1px solid var(--vc-toolbar-border, #2a3a5e);
    overflow-y: auto;
  }
  .sidebar component-palette {
    flex-shrink: 0;
  }
  .sidebar .divider {
    height: 1px;
    background: var(--vc-toolbar-border, #2a3a5e);
    margin: 4px 8px;
  }
  .sidebar process-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .main {
    position: relative;
    overflow: hidden;
  }
  .main canvas-background {
    z-index: 0;
  }
  .main canvas-workspace {
    width: 100%;
    height: 100%;
    display: block;
    position: relative;
    z-index: 1;
  }
  .toolbar-overlay {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 50;
  }
  config-drawer {
    z-index: 100;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
<h1 class="sr-only">Visual Canvas Node Editor</h1>
<nav class="sidebar" aria-label="Pipeline tools">
  <component-palette id="palette"></component-palette>
  <div class="divider"></div>
  <process-list id="process-list"></process-list>
</nav>
<main class="main">
  <canvas-background id="background" type="dots" gap="24"></canvas-background>
  <canvas-workspace id="workspace" tabindex="0"></canvas-workspace>
  <div class="toolbar-overlay">
    <app-toolbar id="toolbar"></app-toolbar>
  </div>
</main>
<config-drawer id="drawer"></config-drawer>
`;

let nodeCounter = 0;

const SELECTORS = { nodeSelector: 'canvas-node', portSelector: 'canvas-port' };

export class AppShell extends HTMLElement {
  #state;
  #commandHistory;
  #visualRegistry;
  #topologyRegistry;
  #schemaRegistry;
  #storageService;
  #exportService;
  #controllers = {};
  #autoSaveTimer = null;
  #onSelectionChanged;
  #onSelectionStyled;
  #onConfigUpdated;
  #onStateChanged;
  #onStateReset;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // Create shared instances
    this.#state = new CanvasState();
    this.#commandHistory = this.#state.commandHistory;
    this.#visualRegistry = new VisualRegistry();
    this.#topologyRegistry = new TopologyRegistry();
    this.#schemaRegistry = new SchemaRegistry();
    this.#storageService = new StorageService();
    this.#exportService = new ExportService();

    // Register starter node types
    registerStarterNodes(this.#visualRegistry, this.#topologyRegistry, this.#schemaRegistry);

    // Bind event handlers
    this.#onSelectionChanged = (e) => this.#handleSelectionChanged(e);
    this.#onSelectionStyled = (e) => {
      const selectedIds = e.detail.selectedIds;
      const workspace = this.shadowRoot.getElementById('workspace');
      const nodes = workspace.shadowRoot
        ? workspace.shadowRoot.querySelectorAll(SELECTORS.nodeSelector)
        : workspace.querySelectorAll(SELECTORS.nodeSelector);
      for (const el of nodes) {
        if (selectedIds.has(el.nodeId)) {
          el.setAttribute('data-selected', '');
        } else {
          el.removeAttribute('data-selected');
        }
      }
    };
    this.#onConfigUpdated = (e) => this.#handleConfigUpdated(e);
    this.#onStateChanged = () => this.#scheduleAutoSave();
    this.#onStateReset = () => {
      this.#reattachControllers();
      this.#scheduleAutoSave();
    };
  }

  connectedCallback() {
    this.setAttribute('aria-label', 'Visual Canvas Node Editor');

    const workspace = this.shadowRoot.getElementById('workspace');
    const background = this.shadowRoot.getElementById('background');
    const palette = this.shadowRoot.getElementById('palette');
    const toolbar = this.shadowRoot.getElementById('toolbar');
    const processList = this.shadowRoot.getElementById('process-list');
    const drawer = this.shadowRoot.getElementById('drawer');

    // Pass shared instances to children
    workspace.state = this.#state;
    background.state = this.#state;
    palette.visualRegistry = this.#visualRegistry;
    palette.topologyRegistry = this.#topologyRegistry;
    toolbar.state = this.#state;
    processList.storageService = this.#storageService;
    processList.state = this.#state;

    // Attach controllers
    this.#attachControllers(workspace);

    // Wire selection → config drawer
    this.#state.addEventListener('selection-changed', this.#onSelectionChanged);

    // Wire selection → data-selected styling
    this.#state.addEventListener('selection-changed', this.#onSelectionStyled);

    // Wire config drawer changes → state
    drawer.addEventListener('node-config-updated', this.#onConfigUpdated);

    // Wire auto-save
    this.#state.addEventListener('node-added', this.#onStateChanged);
    this.#state.addEventListener('node-removed', this.#onStateChanged);
    this.#state.addEventListener('node-moved', this.#onStateChanged);
    this.#state.addEventListener('edge-added', this.#onStateChanged);
    this.#state.addEventListener('edge-removed', this.#onStateChanged);
    this.#state.addEventListener('node-config-updated', this.#onStateChanged);
    this.#state.addEventListener('state-reset', this.#onStateReset);

    // Wire palette drag-and-drop onto canvas
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

    // Wire palette keyboard "Enter" to add at center
    this.addEventListener('palette-add-node', (e) => {
      const { nodeType } = e.detail;
      const rect = workspace.getBoundingClientRect();
      const { panX, panY, zoom } = this.#state.viewport;
      const centerX = (rect.width / 2 - panX) / zoom;
      const centerY = (rect.height / 2 - panY) / zoom;
      this.#addNodeToCanvas(nodeType, centerX, centerY);
    });

    // Wire toolbar events
    this.addEventListener('toolbar-delete-selected', () => {
      for (const nodeId of this.#state.selectedNodeIds) {
        this.#state.removeNode(nodeId);
      }
    });

    this.addEventListener('toolbar-fit-view', () => {
      this.#fitToView(workspace);
    });
  }

  disconnectedCallback() {
    this.#state.removeEventListener('selection-changed', this.#onSelectionChanged);
    this.#state.removeEventListener('selection-changed', this.#onSelectionStyled);
    this.#state.removeEventListener('node-added', this.#onStateChanged);
    this.#state.removeEventListener('node-removed', this.#onStateChanged);
    this.#state.removeEventListener('node-moved', this.#onStateChanged);
    this.#state.removeEventListener('edge-added', this.#onStateChanged);
    this.#state.removeEventListener('edge-removed', this.#onStateChanged);
    this.#state.removeEventListener('node-config-updated', this.#onStateChanged);
    this.#state.removeEventListener('state-reset', this.#onStateReset);

    for (const c of Object.values(this.#controllers)) {
      if (c.detach) c.detach();
    }

    if (this.#autoSaveTimer) clearTimeout(this.#autoSaveTimer);
  }

  #attachControllers(workspace) {
    const edgeLayer = workspace.shadowRoot.querySelector('canvas-edge-layer');
    this.#controllers = {
      drag: new DragController(workspace, this.#state, SELECTORS),
      panZoom: new PanZoomController(workspace, this.#state),
      selection: new SelectionController(workspace, this.#state, SELECTORS),
      edgeRouting: new EdgeRoutingController(workspace, this.#state, edgeLayer, SELECTORS),
      keyboard: new KeyboardController(workspace, this.#state, SELECTORS),
      resize: new ResizeController(workspace, this.#state, SELECTORS),
    };
    for (const c of Object.values(this.#controllers)) c.attach();
  }

  #reattachControllers() {
    const workspace = this.shadowRoot.getElementById('workspace');
    for (const c of Object.values(this.#controllers)) {
      if (c.detach) c.detach();
    }
    // Edge layer is recreated after state-reset, so re-query it after a microtask
    queueMicrotask(() => {
      this.#attachControllers(workspace);
    });
  }

  #addNodeToCanvas(nodeType, x, y) {
    const id = `node-${++nodeCounter}-${Date.now()}`;
    const node = new Node({ id, type: nodeType, x, y, metadata: { config: {} } });

    // Add ports from topology registry
    if (this.#topologyRegistry.has(nodeType)) {
      const topology = this.#topologyRegistry.get(nodeType);
      for (const inputDef of topology.inputs) {
        node.addPort(new Port({
          id: `${id}:${inputDef.id}`,
          direction: 'in',
          nodeId: id,
          positionHint: inputDef.position,
        }));
      }
      for (const outputDef of topology.outputs) {
        node.addPort(new Port({
          id: `${id}:${outputDef.id}`,
          direction: 'out',
          nodeId: id,
          positionHint: outputDef.position,
        }));
      }
    }

    // Set default config from schema
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

  #handleSelectionChanged(e) {
    const drawer = this.shadowRoot.getElementById('drawer');
    const selectedIds = e.detail.selectedIds;

    if (selectedIds.size === 1) {
      const nodeId = selectedIds.values().next().value;
      const node = this.#state.nodes.get(nodeId);
      if (node) {
        const nodeType = node.type;
        const visual = this.#visualRegistry.has(nodeType)
          ? this.#visualRegistry.get(nodeType)
          : null;
        const label = visual ? visual.label : nodeType;

        // open() sets internal nodeId/nodeType so config events include the correct nodeId
        drawer.open(nodeId, label);

        if (this.#schemaRegistry.has(nodeType)) {
          const regSchema = this.#schemaRegistry.get(nodeType);
          // Convert array-based fields to object-based for config drawer
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

  #scheduleAutoSave() {
    if (this.#autoSaveTimer) clearTimeout(this.#autoSaveTimer);
    this.#autoSaveTimer = setTimeout(() => {
      if (this.#state.nodes.size > 0) {
        this.#storageService.save('__autosave', this.#state);
      }
    }, 2000);
  }

  #fitToView(workspace) {
    if (this.#state.nodes.size === 0) return;
    const rect = workspace.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this.#state.nodes.values()) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
    const graphW = maxX - minX;
    const graphH = maxY - minY;
    const padding = 40;
    const scaleX = (rect.width - padding * 2) / graphW;
    const scaleY = (rect.height - padding * 2) / graphH;
    const zoom = Math.min(scaleX, scaleY, 2);
    const panX = (rect.width - graphW * zoom) / 2 - minX * zoom;
    const panY = (rect.height - graphH * zoom) / 2 - minY * zoom;
    this.#state.setViewport(panX, panY, zoom);
  }
}

customElements.define('app-shell', AppShell);
