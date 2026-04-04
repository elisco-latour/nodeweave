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

### C9. Unit test: wireframe storage service

- **File**: `tests/unit/wf-storage-service.test.js`
- Test `list()`, `save()`, `load()`, `remove()` with `wf-pipeline:` key prefix.
- Mock `globalThis.localStorage` (same pattern as existing `tests/unit/storage-service.test.js`).
- Verify key isolation: `wf-pipeline:` prefix keys don't collide with `pipeline:` keys.
- Run: `node --test tests/unit/wf-storage-service.test.js`

### C10. Unit test: wireframe export service

- **File**: `tests/unit/wf-export-service.test.js`
- Mock `document.createElement`, `URL.createObjectURL`, `URL.revokeObjectURL`.
- Verify `exportJSON(state)` creates a Blob with correct JSON content and triggers download.
- Verify it handles both raw objects and objects with `.toJSON()`.
- Run: `node --test tests/unit/wf-export-service.test.js`

## Files Created

- `wireframe/services/storage-service.js`
- `wireframe/services/export-service.js`
- `tests/unit/wf-storage-service.test.js`
- `tests/unit/wf-export-service.test.js`
