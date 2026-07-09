# Accessibility

nodeweave ships accessible defaults: semantic ARIA roles, full keyboard
operation, visible focus, and reduced-motion support.

## Roles

| Element | Role / attributes |
|---------|-------------------|
| `<canvas-workspace>` | `role="application"`, `aria-label`, `aria-roledescription="canvas"` |
| `<canvas-node>` | `role="treeitem"`, `tabindex="0"`, `aria-grabbed`, `aria-roledescription="graph node"`, `aria-label` from the node label |
| `<canvas-port>` | `role="button"`, `tabindex="0"`, `aria-label` (e.g. "Connect to X input") |
| `<canvas-minimap>` | `role="img"`, `aria-label` |
| `<config-drawer>` | `role="complementary"`, `aria-label` |

## Keyboard

With the `KeyboardController` attached (see
[getting-started.md](getting-started.md)):

| Keys | Action |
|------|--------|
| `Tab` / `Shift+Tab` | Move focus between nodes |
| Arrow keys | Nudge selected nodes (1px; `Shift` = 10px) |
| `Delete` / `Backspace` | Remove selected nodes (and connected edges) |
| `Ctrl/⌘ + Z` / `Ctrl/⌘ + Shift + Z` | Undo / redo |
| `Ctrl/⌘ + A` | Select all |
| `Ctrl/⌘ + C` / `V` / `D` | Copy / paste / duplicate |
| `Escape` | Clear selection |
| Hold `Space` + drag | Pan (`PanZoomController`) |

## Focus & motion

- Focus rings use `--vc-focus-ring-color` (see [theming.md](theming.md)); keep
  it visible against your background.
- Animated edges honour `@media (prefers-reduced-motion: reduce)` — the flow
  animation is disabled automatically.

## Guidance

- Give nodes meaningful labels — `<canvas-node>` derives its `aria-label` from
  the label, and `<canvas-port>` announces the port it connects.
- When you build **custom Angular nodes**, include accessible content
  (headings, buttons with labels) inside your component; the node host still
  provides the `treeitem` role and keyboard focus.
- Ensure your theme meets contrast requirements — the defaults are tuned for a
  dark canvas; verify any custom palette.
