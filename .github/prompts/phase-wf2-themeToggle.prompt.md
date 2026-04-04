# Phase 2 — Theme Toggle

> Parent plan: `plan-wireframeMinimapPngThemeCulling.prompt.md`
> Dependencies: none
> Parallel with: Phase 1 (Viewport Culling)

---

## Goal

Add light/dark theme support to the wireframe app with a toggle button. Replace all hardcoded colors with CSS custom properties so every component responds to theme changes.

## Tasks

### 3. Create `wireframe/styles/theme.css`

- `:root` — defaults to light theme (current hardcoded palette)
- `[data-theme="light"]` — explicit light variables
- `[data-theme="dark"]` — dark palette suitable for the wireframe aesthetic
- `@media (prefers-color-scheme: dark)` — auto-detect when no `data-theme` is set
- Use `--wf-*` prefix for all wireframe variables:
  - `--wf-bg` (workspace background)
  - `--wf-bg-surface` (cards, panels)
  - `--wf-bg-elevated` (toolbar, palette)
  - `--wf-text` (primary text)
  - `--wf-text-secondary` (muted text)
  - `--wf-border` (card/panel borders)
  - `--wf-grid-dot` (workspace dot grid)
  - `--wf-edge-color` (edge paths)
  - `--wf-focus-ring` (focus-visible outlines)
  - `--wf-shadow` (drop shadows)
- Map wireframe vars to `--vc-*` for lib components that read them:
  - `--vc-toolbar-border: var(--wf-border)`
  - `--vc-node-bg: var(--wf-bg-surface)`

#### Light palette (current hardcoded values)
- bg: `#f8fafc`, surface: `#ffffff`, text: `#1e293b`, border: `#e2e8f0`, grid dot: `#cbd5e1`

#### Dark palette
- bg: `#0f172a`, surface: `#1e293b`, text: `#e2e8f0`, border: `#334155`, grid dot: `#334155`

### 4. Update wireframe components to use CSS vars

Replace hardcoded color values with `var(--wf-*)` references in each component's `<style>` block:

| Component | Properties to update |
|-----------|---------------------|
| `wf-workspace.js` | `background-color`, `background-image` (grid dot color) |
| `wf-node.js` | card `background`, `border-color`, `color`, header bg, port dot borders |
| `wf-toolbar.js` | toolbar `background`, `border`, button `color`, hover states |
| `wf-palette.js` | palette `background`, `border`, text `color`, divider color |
| `wf-config-drawer.js` | drawer `background`, `border`, input `background`/`border`/`color`, label `color` |
| `wf-edge-layer.js` | path `stroke` color |
| `wf-shell.js` | context menu `background`, `border`, `color`, hover states |

### 5. Create `wireframe/components/wf-theme-toggle.js`

- Web Component `<wf-theme-toggle>`
- Shadow DOM with `<button>` containing sun/moon CSS icons (using pseudo-elements or unicode, no external assets)
- Position: designed to be placed fixed top-right by the shell
- On click:
  1. Read current `document.documentElement.getAttribute('data-theme')`
  2. Toggle between `'light'` and `'dark'`
  3. Set `document.documentElement.setAttribute('data-theme', newTheme)`
  4. Persist to `localStorage.setItem('wf-theme', newTheme)`
  5. Update icon to reflect current state
- On init (`connectedCallback`):
  1. Read `localStorage.getItem('wf-theme')`
  2. If absent, read `window.matchMedia('(prefers-color-scheme: dark)').matches`
  3. Apply the resolved theme
- Accessibility: `aria-label="Toggle theme"`, `aria-pressed` reflects dark mode state

### 6. Wire into shell and HTML

**`wireframe/index.html`:**
- Add `<link rel="stylesheet" href="styles/theme.css">` in `<head>`

**`wireframe/components/wf-shell.js`:**
- Add `import './wf-theme-toggle.js'`
- Add `<wf-theme-toggle>` to the shell template
- Style it via the shell's shadow CSS: `wf-theme-toggle { position: fixed; top: 12px; right: 12px; z-index: 100; }`

### 7. Test: theme toggle component

**File:** `tests/component/wf-theme-toggle.spec.js`
**Fixture:** `tests/component/fixtures/wf-theme-toggle-fixture.html`

- Mount `<wf-theme-toggle>`
- Click the toggle → assert `document.documentElement.getAttribute('data-theme')` switches
- Assert `localStorage.getItem('wf-theme')` is persisted
- Assert `aria-pressed` attribute updates
- Reload (or remount) → assert theme preference is restored from localStorage
- Clear localStorage, set `prefers-color-scheme: dark` media → assert dark theme is auto-detected

**Run:** `pnpm exec playwright test tests/component/wf-theme-toggle.spec.js`

## Files

| Action | File | What changes |
|--------|------|------|
| Create | `wireframe/styles/theme.css` | Theme variables (light + dark) + `--vc-*` mappings |
| Create | `wireframe/components/wf-theme-toggle.js` | Toggle component |
| Create | `tests/component/wf-theme-toggle.spec.js` | Component test for theme toggle |
| Create | `tests/component/fixtures/wf-theme-toggle-fixture.html` | Test fixture |
| Modify | `wireframe/components/wf-workspace.js` | Replace hardcoded colors with CSS vars |
| Modify | `wireframe/components/wf-node.js` | Replace hardcoded colors with CSS vars |
| Modify | `wireframe/components/wf-toolbar.js` | Replace hardcoded colors with CSS vars |
| Modify | `wireframe/components/wf-palette.js` | Replace hardcoded colors with CSS vars |
| Modify | `wireframe/components/wf-config-drawer.js` | Replace hardcoded colors with CSS vars |
| Modify | `wireframe/components/wf-edge-layer.js` | Replace hardcoded colors with CSS vars |
| Modify | `wireframe/components/wf-shell.js` | Import toggle, add to template, style position |
| Modify | `wireframe/index.html` | Add `<link>` for theme.css |

## Reference (read, don't modify)

- `app/styles/theme.css` — reference for CSS variable naming and dark/light palette patterns

## Verification

- `pnpm exec playwright test tests/component/wf-theme-toggle.spec.js` — toggle component test passes
- `pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js` — existing E2E still passes
- Manual: open wireframe — should look identical to before (light theme, same colors)
- Click theme toggle — all components switch to dark palette
- Refresh page — theme preference persists
- Toggle back to light — everything restores
- No unstyled flashes on page load (theme applied before first paint via CSS `:root` defaults)
