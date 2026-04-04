---
name: accessibility
description: "WCAG accessibility requirements for all Web Components and the application. Use when implementing ARIA roles, keyboard navigation, focus management, screen reader support, or axe-core audits. Covers: ARIA role assignments per component, Tab order, keyboard shortcuts (Delete, Ctrl+Z, arrows, Escape), focus-visible indicators, aria-live regions for conditional fields, port keyboard interaction for edge routing, form label associations."
---

# Accessibility

Every component in this project must be **keyboard-navigable and screen-reader accessible**.

## ARIA Roles

| Component | Role | Label |
|-----------|------|-------|
| `<canvas-workspace>` | `application` | "Pipeline canvas" |
| `<canvas-node>` | `treeitem` | Node type label + " node" |
| `<canvas-port>` (input) | `button` | "Connect to {portId} input" |
| `<canvas-port>` (output) | `button` | "Drag from {portId} output" |
| `<canvas-edge-layer>` | `img` | "Pipeline connections" |
| `<config-drawer>` | `complementary` | "Node configuration" |
| `<component-palette>` | `list` | "Available node types" |
| Each palette item | `listitem` | Node type label |
| `<toolbar>` | `toolbar` | "Canvas tools" |
| `<process-list>` | `list` | "Saved pipelines" |
| `<canvas-minimap>` | `img` | "Pipeline overview minimap" |
| `<app-shell>` | `application` | "Visual Canvas Node Editor" |

## Keyboard Navigation

### Tab Order
1. Component palette (sidebar)
2. Toolbar buttons
3. Canvas workspace (receives focus as a whole)
4. Inside canvas: Tab cycles through nodes
5. Config drawer (when open)
6. Process list

### Canvas Keyboard Shortcuts
- `Tab` — cycle focus through nodes (in document order or spatial order)
- `Shift+Tab` — reverse cycle
- `Arrow keys` — nudge selected node(s) by 1px
- `Shift+Arrow` — nudge by 10px
- `Enter` on node — open config drawer for that node
- `Delete` / `Backspace` — remove selected node(s)
- `Escape` — deselect all / cancel edge routing
- `Ctrl+Z` / `Cmd+Z` — undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` — redo
- `Ctrl+A` / `Cmd+A` — select all

### Port Interaction
- Ports are focusable (`tabindex="0"`) and have `role="button"`
- `Enter` / `Space` on output port starts edge routing mode
- In edge routing mode, `Tab` cycles through valid input ports
- `Enter` on input port completes the edge
- `Escape` cancels edge routing

## Focus Indicators
- All focusable elements must have visible focus indicators
- Use `:focus-visible` (not `:focus`) to avoid showing rings on mouse click
- Focus ring: `outline: 2px solid var(--vc-focus-ring-color); outline-offset: 2px;`
- Define `--vc-focus-ring-color` in theme.css

## Live Regions
- `aria-live="polite"` on:
  - Config drawer conditional fields (appear/disappear on showIf)
  - Status messages (e.g., "Pipeline saved", "Node deleted")
- `aria-live="assertive"` — only for critical errors

## Form Accessibility
- Every `<input>`, `<select>`, `<textarea>` must have an associated `<label>` via `for` attribute
- Required fields: `aria-required="true"`
- Invalid fields: `aria-invalid="true"` with `aria-describedby` pointing to error message
- Checkbox labels placed after the input

## Testing Accessibility
- Use `@axe-core/playwright` in every component and E2E test file
- Run axe scan after page/component load
- Assert zero violations
- Test keyboard-only navigation in E2E tests (no mouse actions)
- Verify focus indicators are visible (check computed outline style)

## Common Pitfalls to Avoid
- Do NOT use `div` or `span` as interactive elements — use `button`, `a`, or add `role` + `tabindex`
- Do NOT hide focus indicators with `outline: none`
- Do NOT rely solely on color to convey information (add icons or text)
- Do NOT use `aria-label` on elements that already have visible text labels (use `aria-labelledby` instead)
- Do NOT forget `alt` text on decorative vs informative images
