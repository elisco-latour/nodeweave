const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;

export class KeyboardController {
  #workspace;
  #state;

  #onKeyDown;

  constructor(workspace, canvasState) {
    this.#workspace = workspace;
    this.#state = canvasState;

    this.#onKeyDown = (e) => this.#handleKeyDown(e);
  }

  attach() {
    this.#workspace.addEventListener('keydown', this.#onKeyDown);
  }

  detach() {
    this.#workspace.removeEventListener('keydown', this.#onKeyDown);
  }

  #handleKeyDown(e) {
    const isMac = navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    switch (e.key) {
      case 'Tab':
        this.#handleTab(e);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        this.#handleArrow(e);
        break;
      case 'Delete':
      case 'Backspace':
        this.#handleDelete(e);
        break;
      case 'z':
        if (mod && e.shiftKey) {
          e.preventDefault();
          this.#state.commandHistory.redo();
        } else if (mod) {
          e.preventDefault();
          this.#state.commandHistory.undo();
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.#state.clearSelection();
        break;
      default:
        break;
    }
  }

  #getNodeElements() {
    return this.#workspace.shadowRoot
      ? Array.from(this.#workspace.shadowRoot.querySelectorAll('canvas-node'))
      : Array.from(this.#workspace.querySelectorAll('canvas-node'));
  }

  #handleTab(e) {
    e.preventDefault();
    const nodeEls = this.#getNodeElements();
    if (nodeEls.length === 0) return;

    const focused = this.#workspace.shadowRoot?.activeElement
      ?? this.#workspace.querySelector('canvas-node:focus');
    let idx = focused ? nodeEls.indexOf(focused) : -1;

    if (e.shiftKey) {
      idx = idx <= 0 ? nodeEls.length - 1 : idx - 1;
    } else {
      idx = idx >= nodeEls.length - 1 ? 0 : idx + 1;
    }

    nodeEls[idx].focus();
  }

  #handleArrow(e) {
    const selected = this.#state.selectedNodeIds;
    if (selected.size === 0) return;

    e.preventDefault();
    const step = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
    let dx = 0;
    let dy = 0;

    switch (e.key) {
      case 'ArrowUp': dy = -step; break;
      case 'ArrowDown': dy = step; break;
      case 'ArrowLeft': dx = -step; break;
      case 'ArrowRight': dx = step; break;
    }

    const positionMap = new Map();
    for (const nodeId of selected) {
      const node = this.#state.nodes.get(nodeId);
      if (node) {
        positionMap.set(nodeId, { x: node.x + dx, y: node.y + dy });
      }
    }

    if (positionMap.size > 0) {
      this.#state.setNodePositions(positionMap);
    }
  }

  #handleDelete(e) {
    const selected = this.#state.selectedNodeIds;
    if (selected.size === 0) return;

    e.preventDefault();
    // Remove nodes in reverse to avoid issues with concurrent modification
    const ids = [...selected];
    for (const nodeId of ids) {
      this.#state.removeNode(nodeId);
    }
  }
}
