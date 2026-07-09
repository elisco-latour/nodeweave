# Theming

Every `@nodeweave/core` Web Component (and the `@nodeweave/angular` renderer)
styles itself through `--nw-*` CSS custom properties with built-in fallbacks.
Set them on `:root` (or any ancestor) to theme the canvas — no build step,
and dark/light is just a different set of values.

```css
:root {
  --nw-node-bg: #16213e;
  --nw-node-border: #2a3a5e;
  --nw-text-color: #e2e8f0;
  --nw-edge-color: #64748b;
  --nw-bg-pattern: #334155;
}
```

## Variables

### Nodes & text
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-node-bg` | `#16213e` | Node background |
| `--nw-node-border` | `#2a3a5e` | Node border |
| `--nw-node-radius` | `8px` | Node corner radius |
| `--nw-text-color` | `#e0e0e0` | Node / drawer text |
| `--nw-font-family` | `system-ui, …` | Font family |
| `--nw-font-size` | `0.875rem` | Font size |

### Ports
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-port-color` | `#888` | Port fill |
| `--nw-port-border-color` | `#555` | Port border |
| `--nw-port-hover-color` | `#4dabf7` | Port fill on hover / valid target |
| `--nw-port-hover-border-color` | `#339af0` | Port border on hover |

### Edges
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-edge-color` | `#666` | Edge stroke (also the arrowhead, via `context-stroke`) |
| `--nw-edge-color-phantom` | `#999` | In-progress (phantom) edge while connecting |
| `--nw-edge-label-bg` | `#16213e` | Edge label pill background |
| `--nw-edge-label-border` | `#2a3a5e` | Edge label pill border |
| `--nw-edge-label-color` | `#e0e0e0` | Edge label text |

### Background
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-bg-color` | `transparent` | `<canvas-background>` fill behind the pattern |
| `--nw-bg-pattern` | `#cbd5e1` | Dot / line / cross colour |

### Selection, focus & resize
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-selection-border` | `#4dabf7` | Selected-node outline / rubber band border |
| `--nw-selection-bg` | `rgba(77,171,247,0.1)` | Rubber-band fill |
| `--nw-focus-ring-color` | `#4dabf7` | Keyboard focus ring |
| `--nw-resize-outline` | `#4dabf7` | Resize bounding outline |
| `--nw-resize-handle` | `#fff` | Resize handle fill |
| `--nw-resize-handle-border` | `#4dabf7` | Resize handle border |

### Controls
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-controls-bg` | `#16213e` | `<canvas-controls>` background |
| `--nw-controls-border` | `#2a3a5e` | Controls border |
| `--nw-controls-fg` | `#e0e0e0` | Control icon colour |
| `--nw-controls-hover` | `rgba(255,255,255,0.1)` | Control hover background |
| `--nw-controls-radius` | `8px` | Controls corner radius |

### Config drawer & form inputs
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-drawer-bg` | `#16213e` | Drawer background |
| `--nw-drawer-border` | `#2a3a5e` | Drawer border |
| `--nw-drawer-hover` | `rgba(255,255,255,0.1)` | Drawer button hover |
| `--nw-input-bg` | `#1a1a2e` | Form input background |
| `--nw-input-border` | `#2a3a5e` | Form input border |
| `--nw-label-color` | `#aab` | Field label |
| `--nw-error-bg` | `rgba(244,67,54,0.2)` | Remove-button hover |
| `--nw-error-color` | `#f44336` | Remove-button hover border |

### Minimap
| Variable | Default | Purpose |
|----------|---------|---------|
| `--nw-toolbar-border` | `#2a3a5e` | Minimap border |

(The minimap also reuses `--nw-node-bg` for its own background.)

## Light theme example

```css
:root {
  --nw-node-bg: #ffffff;
  --nw-node-border: #e2e8f0;
  --nw-text-color: #0f172a;
  --nw-edge-color: #94a3b8;
  --nw-bg-pattern: #cbd5e1;
  --nw-controls-bg: #ffffff;
  --nw-controls-fg: #0f172a;
  --nw-drawer-bg: #ffffff;
  --nw-input-bg: #f8fafc;
}
```

Toggle dark/light by swapping the values under a selector such as
`:root[data-theme="light"]` or a `@media (prefers-color-scheme: light)` block.
