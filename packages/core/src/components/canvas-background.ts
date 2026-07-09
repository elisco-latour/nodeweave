import type { CanvasState } from '../core/canvas-state.js';

export type BackgroundType = 'dots' | 'lines' | 'cross';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-color: var(--nw-bg-color, transparent);
  }
</style>
`;

/**
 * <canvas-background> — a grid background layer (dots, lines, or cross).
 *
 * Place it behind a (transparent) workspace. Assign `.state` to sync the
 * pattern with the viewport: it pans with panX/panY and its spacing scales
 * with zoom, matching the nodes above it.
 *
 * Attributes / properties: type ('dots'|'lines'|'cross'), gap (px),
 * size (dot radius / line width, px), color (CSS color).
 */
export class CanvasBackground extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['type', 'gap', 'size', 'color'];
  }

  #state: CanvasState | null = null;
  #type: BackgroundType = 'dots';
  #gap = 20;
  #size = 0; // 0 → per-type default
  #color = ''; // '' → CSS var default
  readonly #onViewportChanged: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
    this.#onViewportChanged = () => this.#render();
  }

  connectedCallback(): void {
    this.setAttribute('aria-hidden', 'true');
    this.#render();
  }

  disconnectedCallback(): void {
    this.#state?.removeEventListener('viewport-changed', this.#onViewportChanged);
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'type') this.#type = (value as BackgroundType) || 'dots';
    else if (name === 'gap') this.#gap = value ? Number(value) : 20;
    else if (name === 'size') this.#size = value ? Number(value) : 0;
    else if (name === 'color') this.#color = value ?? '';
    this.#render();
  }

  get state(): CanvasState | null { return this.#state; }
  set state(s: CanvasState | null) {
    this.#state?.removeEventListener('viewport-changed', this.#onViewportChanged);
    this.#state = s;
    this.#state?.addEventListener('viewport-changed', this.#onViewportChanged);
    this.#render();
  }

  get type(): BackgroundType { return this.#type; }
  set type(v: BackgroundType) { this.#type = v; this.#render(); }
  get gap(): number { return this.#gap; }
  set gap(v: number) { this.#gap = v; this.#render(); }
  get color(): string { return this.#color; }
  set color(v: string) { this.#color = v; this.#render(); }

  #render(): void {
    const vp = this.#state?.viewport ?? { panX: 0, panY: 0, zoom: 1 };
    const tile = this.#gap * vp.zoom;

    this.style.backgroundPosition = `${vp.panX}px ${vp.panY}px`;
    this.style.backgroundSize = `${tile}px ${tile}px`;
    this.style.backgroundImage = this.#patternImage();
  }

  #patternImage(): string {
    if (this.#type === 'lines') {
      const color = this.#color || 'var(--nw-bg-pattern, #cbd5e1)';
      const w = this.#size || 1;
      return (
        `linear-gradient(to right, ${color} ${w}px, transparent ${w}px),` +
        `linear-gradient(to bottom, ${color} ${w}px, transparent ${w}px)`
      );
    }

    if (this.#type === 'cross') {
      // Concrete color (SVG data URIs cannot resolve CSS custom properties).
      const color = this.#color || '#cbd5e1';
      const g = this.#gap;
      const half = g / 2;
      const arm = (this.#size || 6) / 2;
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${g}' height='${g}'>` +
        `<path d='M${half} ${half - arm}V${half + arm}M${half - arm} ${half}H${half + arm}' ` +
        `stroke='${color}' stroke-width='1'/></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }

    // dots (default)
    const color = this.#color || 'var(--nw-bg-pattern, #cbd5e1)';
    const r = this.#size || 1;
    return `radial-gradient(circle, ${color} ${r}px, transparent ${r}px)`;
  }
}

customElements.define('canvas-background', CanvasBackground);
