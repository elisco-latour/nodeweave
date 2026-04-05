# PNG Export — Implementation Challenges

## 1. SVG foreignObject Taints the Canvas (All Browsers)

**Problem:** The initial approach serialized the DOM viewport via `XMLSerializer`, wrapped it in an `<svg><foreignObject>` envelope, loaded it as an `Image`, then drew it onto a `<canvas>`. This follows a well-known pattern used in many DOM-to-image libraries.

However, browsers treat any canvas that has had an SVG foreignObject image drawn onto it as **tainted** — a security restriction to prevent exfiltration of cross-origin or privileged content. Calling `canvas.toBlob()` on a tainted canvas throws:

```
SecurityError: Failed to execute 'toBlob' on 'HTMLCanvasElement':
Tainted canvases may not be exported.
```

This is **not** a headless-only issue. It happens in all browsers (Chrome, Firefox, Safari) regardless of same-origin content.

**Initial mitigation:** Added a try/catch around `canvas.toBlob()` with a JSON fallback download. This "worked" but meant the user always got a JSON file, never a PNG.

**Final fix:** Replaced the entire SVG foreignObject approach with **programmatic Canvas 2D drawing**. The export reads node positions, dimensions, port data, and visual registry colors directly from `CanvasState`, then draws rounded rects, colored headers, labels, port dots, and Bezier edge curves using the Canvas API. No DOM serialization, no `Image` loading, no tainted canvas.

---

## 2. `<a>.click()` Doesn't Trigger Downloads Without DOM Attachment

**Problem:** The download trigger pattern `a.click()` without appending the `<a>` element to the document body does not reliably trigger downloads in Playwright (and some browser contexts).

**Fix:** Append the anchor to `document.body`, click it, then remove it:

```js
a.style.display = 'none';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

---

## 3. `require('fs')` Not Available in ESM Playwright Tests

**Problem:** The test used `const fs = require('fs')` to check the downloaded file size, but the project uses ES modules (`"type": "module"` in package.json). Playwright test files are ESM, so `require` is not defined.

```
ReferenceError: require is not defined
```

**Fix:** Use ESM import at the top of the file:

```js
import fs from 'fs';
```

---

## 4. Wrong Node Type in E2E Test

**Problem:** The test tried to add a node via `addNodeViaPalette(page, 'trigger')`, but the wireframe registries don't have a `trigger` node type. The palette couldn't find the element:

```
Error: Palette item for type "trigger" not found
```

**Fix:** Check `wireframe/registries.js` for actual registered types. The correct type was `range_input`. Always verify available node types against the wireframe's own registry, not the app consumer's starter nodes.

---

## 5. `canvas.toBlob()` Throws (Doesn't Return Null)

**Problem:** The initial error handling assumed `canvas.toBlob()` would return `null` on failure. In reality, for tainted canvases it **throws a synchronous SecurityError** before the callback is ever invoked.

**Fix:** Wrap the `canvas.toBlob()` call in a try/catch. But ultimately this became moot when the entire approach was replaced with programmatic drawing.

---

## Key Takeaway

**Never use SVG foreignObject for DOM-to-PNG export if you need `canvas.toBlob()` or `canvas.toDataURL()`.** The canvas will always be tainted. Instead, draw programmatically from your data model using the Canvas 2D API. This is also more reliable, faster, and produces cleaner output since you control exactly what gets rendered.
