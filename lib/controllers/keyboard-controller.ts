import type { CanvasState } from '../core/canvas-state.js';
import type { ControllerOptions } from '../types.js';

const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;

export class KeyboardController {
  readonly #workspace: HTMLElement;
  readonly #state: CanvasState;
  readonly #nodeSelector: string;

  readonly #onKeyDown: (e: KeyboardEvent) => void;

  constructor(workspace: HTMLElement, canvasState: CanvasState, options: ControllerOptions) {
    if (!options?.nodeSelector) {
      throw new Error('KeyboardController requires options with nodeSelector');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#nodeSelector = options.nodeSelector;

    this.#onKeyDown = (e) => this.#handleKeyDown(e);
  }

  attach(): void {
    this.#workspace.addEventListener('keydown', this.#onKeyDown);
  }

  detach(): void {
    this.#workspace.removeEventListener('keydown', this.#onKeyDown);
  }

  #handleKeyDown(e: KeyboardEvent): void {
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
          this.#state.selectNodes([...this.#state.nodes.keys()]);
        }
        break;
      case 'c':
        if (mod) { e.preventDefault(); this.#state.copySelection(); }
        break;
      case 'v':
        if (mod) { e.preventDefault(); this.#state.paste(); }
        break;
      case 'd':
        if (mod) { e.preventDefault(); this.#state.duplicate(); }
        break;
      case 'Escape':
        e.preventDefault();
        this.#state.clearSelection();
        break;
    }
  }

  #getNodeElements(): Element[] {
    return Array.from(this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector)
      : this.#workspace.querySelectorAll(this.#nodeSelector));
  }

  #handleTab(e: KeyboardEvent): void {
    e.preventDefault();
    const nodeEls = this.#getNodeElements();
    if (nodeEls.length === 0) return;

    const focused = this.#workspace.shadowRoot?.activeElement
      ?? this.#workspace.querySelector(`${this.#nodeSelector}:focus`);
    let idx = focused ? nodeEls.indexOf(focused) : -1;

    idx = e.shiftKey
      ? (idx <= 0 ? nodeEls.length - 1 : idx - 1)
      : (idx >= nodeEls.length - 1 ? 0 : idx + 1);

    (nodeEls[idx] as HTMLElement).focus?.();
  }

  #handleArrow(e: KeyboardEvent): void {
    const selected = this.#state.selectedNodeIds;
    if (selected.size === 0) return;
    e.preventDefault();

    const step = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;

    const positionMap = new Map<string, { x: number; y: number }>();
    for (const nodeId of selected) {
      const node = this.#state.nodes.get(nodeId);
      if (node) positionMap.set(nodeId, { x: node.x + dx, y: node.y + dy });
    }
    if (positionMap.size > 0) this.#state.setNodePositions(positionMap);
  }

  #handleDelete(e: KeyboardEvent): void {
    const selected = this.#state.selectedNodeIds;
    if (selected.size === 0) return;
    e.preventDefault();
    for (const nodeId of [...selected]) this.#state.removeNode(nodeId);
  }
}
