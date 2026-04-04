# Phase C: Wireframe Services

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). Depends on Phase A. Parallel with Phase B.

---

## Goal

Give the wireframe consumer its own storage and export services.

## Steps

### C7. `wireframe/services/storage-service.js`

~30-line localStorage service with `wf-pipeline:` key prefix. Same API shape as `app/services/storage-service.js`:
- `list()` — returns saved pipeline names
- `save(name, json)` — persist
- `load(name)` — retrieve
- `remove(name)` — delete

### C8. `wireframe/services/export-service.js`

JSON-only export service:
- `exportJSON(state)` — triggers download of `pipeline.json`

No PNG export (excluded from wireframe scope).

## Files Created

- `wireframe/services/storage-service.js`
- `wireframe/services/export-service.js`
