# Phase 4 — PNG Export

> Parent plan: `plan-wireframeMinimapPngThemeCulling.prompt.md`
> Dependencies: Phase 2 (Theme Toggle — toolbar already modified)
> Parallel with: Phase 3 (Minimap)

---

## Goal

Add PNG export to the wireframe app so users can download a screenshot of their pipeline canvas. Adapts the proven approach from the app consumer's `ExportService.toPNG()`.

## Tasks

### 9. Add `exportPNG(workspaceElement)` to `wireframe/services/export-service.js`

Adapt from `app/services/export-service.js` `toPNG()` method. The approach:

1. Get the `.viewport` element from the workspace's Shadow DOM
2. Serialize it with `new XMLSerializer().serializeToString(viewport)`
3. Wrap in an SVG+foreignObject envelope with explicit `xmlns` and dimensions
4. Create a `Blob` from the SVG string (`image/svg+xml;charset=utf-8`)
5. Create an object URL, load into an `Image`
6. On image load: draw onto an offscreen `<canvas>`, export as PNG via `canvas.toBlob()`
7. Trigger download as `pipeline.png` using the existing `<a>` download pattern
8. Clean up: revoke object URLs

**Fallback:** If the image fails to load (e.g., cross-origin issues, unsupported CSS), fall back to JSON export with `console.warn`.

**Key differences from app consumer:**
- App's `toPNG()` returns a `Blob` for the caller to handle
- Wireframe's `exportPNG()` triggers the download directly (consistent with existing `exportJSON()` pattern)

### 10. Add PNG export button to `wf-toolbar.js`

- Add a new button in the toolbar pill alongside Undo/Redo/Zoom/Fit/Delete
- Icon: camera or download glyph (unicode `📷` or `⬇` or SVG path — keep consistent with existing toolbar icon style)
- Add a visual divider before the button (same pattern as existing dividers)
- On click: dispatch `new CustomEvent('toolbar-export-png', { bubbles: true, composed: true })`
- `aria-label="Export as PNG"`
- `title="Export as PNG"`

### 11. Wire in `wf-shell.js`

- Import `ExportService` from `../services/export-service.js` (if not already imported)
- Add event listener in `connectedCallback`:
  ```js
  this.addEventListener('toolbar-export-png', () => {
    const workspace = this.shadowRoot.querySelector('wf-workspace');
    ExportService.exportPNG(workspace);
  });
  ```

### 12. Test: PNG export

**File:** `tests/e2e/wf-png-export.spec.js`

- Navigate to wireframe app
- Add a node so the canvas isn't empty
- Set up download listener: `page.waitForEvent('download')`
- Click the PNG export button in the toolbar
- Assert download occurs with filename `pipeline.png`
- Assert downloaded file size > 0
- Optionally assert MIME type is `image/png`

**Run:** `pnpm exec playwright test tests/e2e/wf-png-export.spec.js`

## Files

| Action | File | What changes |
|--------|------|------|
| Modify | `wireframe/services/export-service.js` | Add `exportPNG(workspaceElement)` static method |
| Modify | `wireframe/components/wf-toolbar.js` | Add PNG export button, dispatch event |
| Modify | `wireframe/components/wf-shell.js` | Listen for `toolbar-export-png`, call `ExportService.exportPNG()` |
| Create | `tests/e2e/wf-png-export.spec.js` | E2E test for PNG export |

## Reference (read, don't modify)

- `app/services/export-service.js` — `toPNG(canvasWorkspaceElement)` method (lines 6–50). Uses XMLSerializer → SVG → Image → Canvas → Blob pipeline. Has JSON fallback on error.

## Security Considerations

- The SVG serialization uses `XMLSerializer` which safely encodes content
- Object URLs are revoked after use to prevent memory leaks
- No user-supplied content is injected into the SVG raw — only serialized DOM

## Verification

- `pnpm exec playwright test tests/e2e/wf-png-export.spec.js` — PNG export E2E test passes
- `pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js` — existing E2E still passes
- Manual: open wireframe, add a few connected nodes
- Click the PNG export button in the toolbar
- Browser should download `pipeline.png`
- Open the PNG — should show a snapshot of the canvas viewport
- If serialization fails, should fall back to JSON download with a console warning
- Existing toolbar buttons still work: undo, redo, zoom, fit, delete
