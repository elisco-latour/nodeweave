# Theming

Every `@nodeweave/core` Web Component (and the `@nodeweave/angular` renderer)
styles itself through `--vc-*` CSS custom properties with built-in fallbacks.
Set them on `:root` (or any ancestor) to theme the canvas — no build step,
and dark/light is just a different set of values.

```css
:root {
  --vc-node-bg: #16213e;
  --vc-node-border: #2a3a5e;
  --vc-text-color: #e2e8f0;
  --vc-edge-color: #64748b;
  --vc-bg-pattern: #334155;
}
```

## Variables

### Nodes & text
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-node-bg` | `#16213e` | Node background |
| `--vc-node-border` | `#2a3a5e` | Node border |
| `--vc-node-radius` | `8px` | Node corner radius |
| `--vc-text-color` | `#e0e0e0` | Node / drawer text |
| `--vc-font-family` | `system-ui, …` | Font family |
| `--vc-font-size` | `0.875rem` | Font size |

### Ports
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-port-color` | `#888` | Port fill |
| `--vc-port-border-color` | `#555` | Port border |
| `--vc-port-hover-color` | `#4dabf7` | Port fill on hover / valid target |
| `--vc-port-hover-border-color` | `#339af0` | Port border on hover |

### Edges
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-edge-color` | `#666` | Edge stroke (also the arrowhead, via `context-stroke`) |
| `--vc-edge-color-phantom` | `#999` | In-progress (phantom) edge while connecting |
| `--vc-edge-label-bg` | `#16213e` | Edge label pill background |
| `--vc-edge-label-border` | `#2a3a5e` | Edge label pill border |
| `--vc-edge-label-color` | `#e0e0e0` | Edge label text |

### Background
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-bg-color` | `transparent` | `<canvas-background>` fill behind the pattern |
| `--vc-bg-pattern` | `#cbd5e1` | Dot / line / cross colour |

### Selection, focus & resize
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-selection-border` | `#4dabf7` | Selected-node outline / rubber band border |
| `--vc-selection-bg` | `rgba(77,171,247,0.1)` | Rubber-band fill |
| `--vc-focus-ring-color` | `#4dabf7` | Keyboard focus ring |
| `--vc-resize-outline` | `#4dabf7` | Resize bounding outline |
| `--vc-resize-handle` | `#fff` | Resize handle fill |
| `--vc-resize-handle-border` | `#4dabf7` | Resize handle border |

### Controls
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-controls-bg` | `#16213e` | `<canvas-controls>` background |
| `--vc-controls-border` | `#2a3a5e` | Controls border |
| `--vc-controls-fg` | `#e0e0e0` | Control icon colour |
| `--vc-controls-hover` | `rgba(255,255,255,0.1)` | Control hover background |
| `--vc-controls-radius` | `8px` | Controls corner radius |

### Config drawer & form inputs
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-drawer-bg` | `#16213e` | Drawer background |
| `--vc-drawer-border` | `#2a3a5e` | Drawer border |
| `--vc-drawer-hover` | `rgba(255,255,255,0.1)` | Drawer button hover |
| `--vc-input-bg` | `#1a1a2e` | Form input background |
| `--vc-input-border` | `#2a3a5e` | Form input border |
| `--vc-label-color` | `#aab` | Field label |
| `--vc-error-bg` | `rgba(244,67,54,0.2)` | Remove-button hover |
| `--vc-error-color` | `#f44336` | Remove-button hover border |

### Minimap
| Variable | Default | Purpose |
|----------|---------|---------|
| `--vc-toolbar-border` | `#2a3a5e` | Minimap border |

(The minimap also reuses `--vc-node-bg` for its own background.)

## Light theme example

```css
:root {
  --vc-node-bg: #ffffff;
  --vc-node-border: #e2e8f0;
  --vc-text-color: #0f172a;
  --vc-edge-color: #94a3b8;
  --vc-bg-pattern: #cbd5e1;
  --vc-controls-bg: #ffffff;
  --vc-controls-fg: #0f172a;
  --vc-drawer-bg: #ffffff;
  --vc-input-bg: #f8fafc;
}
```

Toggle dark/light by swapping the values under a selector such as
`:root[data-theme="light"]` or a `@media (prefers-color-scheme: light)` block.
