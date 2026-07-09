/**
 * <wf-theme-toggle> — Light/dark theme toggle button.
 *
 * Reads/persists theme to localStorage('wf-theme').
 * Falls back to prefers-color-scheme when no preference is stored.
 * Sets data-theme attribute on document.documentElement.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: var(--wf-bg-surface, #ffffff);
    border: 1px solid var(--wf-border, #e2e8f0);
    border-radius: 999px;
    color: var(--wf-text, #1e293b);
    cursor: pointer;
    box-shadow: 0 2px 4px var(--wf-shadow, rgba(0,0,0,0.05));
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    font-size: 18px;
    line-height: 1;
  }
  button:hover {
    background: var(--wf-hover-bg, #f1f5f9);
  }
  button:focus-visible {
    outline: 2px solid var(--wf-focus-ring, #3b82f6);
    outline-offset: 2px;
  }

  .icon-sun,
  .icon-moon {
    display: none;
    pointer-events: none;
  }

  :host([data-active-theme="light"]) .icon-sun { display: block; }
  :host([data-active-theme="dark"]) .icon-moon { display: block; }
</style>
<button aria-label="Toggle theme" aria-pressed="false">
  <span class="icon-sun" aria-hidden="true">☀︎</span>
  <span class="icon-moon" aria-hidden="true">☾</span>
</button>
`;

export class WfThemeToggle extends HTMLElement {
  #button;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.#button = this.shadowRoot.querySelector('button');

    this.#button.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.#applyTheme(next);
      localStorage.setItem('wf-theme', next);
    });
  }

  connectedCallback() {
    const stored = localStorage.getItem('wf-theme');
    if (stored) {
      this.#applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.#applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  #applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    this.#button.setAttribute('aria-pressed', String(isDark));
    this.setAttribute('data-active-theme', theme);
  }
}

customElements.define('wf-theme-toggle', WfThemeToggle);
