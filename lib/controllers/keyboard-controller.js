const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;

/**
 * @typedef {{ node: string }} KeyboardSelectors
 */

export class KeyboardController {
  /** @type {HTMLElement} */ #workspace;
  /** @type {import('../core/canvas-state.js').CanvasState} */ #state;
  /** @type {string} */ #nodeSelector;

  #onKeyDown;

  /**
   * @param {HTMLElement} workspace
   * @param {import('../core/canvas-state.js').CanvasState} canvasState
   * @param {KeyboardSelectors} selectors
   */
  constructor(workspace, canvasState, selectors) {
    if (!selectors?.node) {
      throw new Error('KeyboardController requires selectors with node property');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#nodeSelector = selectors.node;

    this.#onKeyDown = (e) => this.#handleKeyDown(e);
  }

  /** @returns {void} */
  attach() {
    this.#workspace.addEventListener('keydown', this.#onKeyDown);
  }

  /** @returns {void} */
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
      case 'a':
        if (mod) {
          e.preventDefault();
          const allIds = [...this.#state.nodes.keys()];
          this.#state.selectNodes(allIds);
        }
        break;
      case 'c':
        if (mod) {
          e.preventDefault();
          this.#state.copySelection();
        }
        break;
      case 'v':
        if (mod) {
          e.preventDefault();
          this.#state.paste();
        }
        break;
      case 'd':
        if (mod) {
          e.preventDefault();
          this.#state.duplicate();
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
      ? Array.from(this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector))
      : Array.from(this.#workspace.querySelectorAll(this.#nodeSelector));
  }

  #handleTab(e) {
    e.preventDefault();
    const nodeEls = this.#getNodeElements();
    if (nodeEls.length === 0) return;

    const focused = this.#workspace.shadowRoot?.activeElement
      ?? this.#workspace.querySelector(`${this.#nodeSelector}:focus`);
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
