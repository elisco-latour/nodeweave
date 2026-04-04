---
name: web-components
description: "Custom Elements with Shadow DOM conventions for this project. Use when creating, editing, or reviewing any Web Component in lib/components/ or app/components/. Covers: Shadow DOM setup, CSS custom properties (--vc- prefix), connectedCallback/disconnectedCallback lifecycle, property vs attribute passing, CustomEvent with composed:true, DocumentFragment rendering, :host styling, canvas- and app- tag prefixes."
---

# Web Components

All visual elements in this project are **Custom Elements with Shadow DOM**.

## Element Registration
- Extend `HTMLElement`
- Define in `connectedCallback()` or constructor
- Register with `customElements.define('prefix-name', ClassName)`
- Tag names use `canvas-` prefix for library components, `app-` prefix for application components
- One element per file, file name matches tag name: `canvas-node.js` → `<canvas-node>`

## Shadow DOM
- Always use `this.attachShadow({ mode: 'open' })`
- All styles go inside Shadow DOM via `<style>` block or adopted stylesheets
- Use CSS custom properties (from `theme.css`) for all colors, spacing, fonts
- NEVER use hard-coded color values — always `var(--vc-property-name)`
- Custom property prefix: `--vc-` (visual canvas)

## Lifecycle
- `connectedCallback()` — attach event listeners, start observing state
- `disconnectedCallback()` — remove event listeners, clean up subscriptions
- Always clean up in `disconnectedCallback()` to prevent memory leaks
- Do NOT do heavy work in the constructor — defer to `connectedCallback()`

## Communication
- **Parent → Child:** Set properties (not attributes) for object/array data
- **Child → Parent:** Dispatch `CustomEvent` with `{ bubbles: true, composed: true }` to cross Shadow DOM boundaries
- **Sibling → Sibling:** Go through shared state (`CanvasState`) events, never directly reference siblings

## Rendering
- Use `DocumentFragment` when inserting multiple elements at once
- For dynamic lists, prefer clearing + rebuilding from fragment over incremental DOM diffing
- Use `this.shadowRoot.getElementById()` or `this.shadowRoot.querySelector()` to find internal elements

## Attributes vs Properties
- Use attributes for simple string/boolean values that might be set in HTML
- Use properties for complex objects (state instances, registries)
- Reflect important state to attributes for CSS styling: `this.toggleAttribute('selected', isSelected)`

## Styling Conventions
- `:host` for the element itself
- `:host([attribute])` for attribute-based states
- `:host(:focus-visible)` for focus indicators
- `::slotted()` only when using `<slot>` elements
- No `!important` — ever
