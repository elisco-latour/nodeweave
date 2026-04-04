# Phase B: Wireframe Port Interface

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). Depends on Phase A. Parallel with Phase C.

---

## Goal

Make wireframe port dots and edge layer satisfy the library's duck-type contracts so controllers can interact with them.

## Steps

### B4. `wf-node.js` — expose port properties

Set on each port dot element:
- `.portId` property
- `.direction` property (`'in'` | `'out'`)
- `.nodeId` property
- `data-port` attribute

Controllers find ports via the `'[data-port]'` selector.

### B5. `wf-edge-layer.js` — public `_getPortPosition(portId)`

Add a public `_getPortPosition(portId)` method that delegates to the existing private `#getPortCenter()`.

### B6. `wf-edge-layer.js` — phantom edge CSS

Add CSS rule for the phantom path used during edge creation:

```css
path.phantom { stroke-dasharray: 8 4; opacity: 0.5; }
```

## Files Modified

- `wireframe/components/wf-node.js`
- `wireframe/components/wf-edge-layer.js`

## Duck-Type Contracts Satisfied

- **Port elements** (`[data-port]`): `.portId`, `.direction`, `.nodeId`
- **Edge layer**: `_getPortPosition(portId)` + `<path class="phantom">` injection
