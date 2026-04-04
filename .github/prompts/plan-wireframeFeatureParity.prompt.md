# Plan: Wireframe Feature Parity (Clean Break)

The library becomes consumer-agnostic. No defaults, no backwards compat — every consumer declares its DOM shape explicitly.

---

## Phases

| Phase | Prompt | Summary |
|-------|--------|---------|
| **A** | [plan-wfp-phase-a](plan-wfp-phase-a.prompt.md) | Library controller decoupling — required selectors |
| **B** | [plan-wfp-phase-b](plan-wfp-phase-b.prompt.md) | Wireframe port interface (parallel with C) |
| **C** | [plan-wfp-phase-c](plan-wfp-phase-c.prompt.md) | Wireframe services (parallel with B) |
| **D** | [plan-wfp-phase-d](plan-wfp-phase-d.prompt.md) | Wireframe UI components (steps parallel) |
| **E** | [plan-wfp-phase-e](plan-wfp-phase-e.prompt.md) | Shell & wiring (depends on A–D) |
| **F** | [plan-wfp-phase-f](plan-wfp-phase-f.prompt.md) | Cross-cutting verification: a11y audit & full regression (depends on E) |

## Dependency Graph

```
A → B+C (parallel) → D (steps parallel) → E → F
```

---

## Duck-Type Contracts the Library Now Enforces

- **Node elements** matching `selectors.node`: must expose `.nodeId` property
- **Port elements** matching `selectors.port`: must expose `.portId`, `.direction`, `.nodeId` properties
- **Edge layer** passed to `EdgeRoutingController`: must expose `_getPortPosition(portId)` + allow `<path class="phantom">` injection into shadow SVG

---

## Excluded

- Minimap, PNG export, theme toggle, viewport culling — lighter consumer, add later if needed.
