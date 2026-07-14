---
name: accenture-fluent-angular
description: Build or restyle Angular frontends for Accenture in Microsoft Fluent Design on the Accenture brand. Provides a drop-in two-layer design-token system (Accenture purple ramp + Fluent neutrals, light + dark), inline Fluent System Icons (no emojis, no icon package), the app-shell pattern (plum command bar + collapsible left rail, router-based), reusable surface patterns (master-detail, data table with paging, wizard, notifications, settings dashboard), dark mode, and the hard-won Angular gotchas. Use whenever the work involves an Accenture Angular app, Fluent Design, Accenture brand/purple styling, or "Runway-style" UI.
---

# Accenture Fluent Angular

Build Angular frontends that read as polished **Microsoft Fluent** products on the **Accenture brand** — calm, high-signal, accessible, and coherent. This skill is project-agnostic: use it for any Accenture Angular app, not one specific product.

Assumes Angular standalone components, **signals**, and **zoneless** change detection (Angular 17+; validated on 22). Adapt selector prefixes (`ui-`, `ax-`, or your app's) to the project.

## When to use

- Starting a new Accenture Angular frontend, or restyling an existing one.
- The user mentions **Accenture branding / purple**, **Fluent Design**, a Microsoft-Lists-like look, or a "Runway-style" UI.
- Building any of: an app shell, a data table, a master-detail workspace, a dashboard, a settings page, a wizard/modal, or a notifications surface.

## Non-negotiable principles

1. **Fluent language, Accenture brand.** Fluent's calm layout, depth, typography, and interaction feel; Accenture's purple identity.
2. **Two-layer tokens, never raw hex.** Primitives (colour ramps) → semantic tokens (`--surface`, `--accent`, `--brand`…). Components consume semantics only. See `references/design-tokens.css`.
3. **Accessible brand rule.** Vivid Accenture purple **`#A100FF`** (`--brand`) is for *fills and identity only*. Interactive text/icons on light use the deeper **`#7500C0`** (`--accent`, ~8:1 contrast). Chrome/top bar is the darkest purple **`#460073`**. Never use `#A100FF` for body text or small text on white — it fails WCAG AA.
4. **No emojis.** Use vendored **Fluent System Icons** as inline `currentColor` SVG (an `<ui-icon>` component). No emoji glyphs anywhere. See `references/icon-component.ts`.
5. **One job per surface; don't cargo-cult.** Each surface has a single clear purpose. When drawing from Microsoft Lists/Teams, take the *pattern*, not literal buttons (don't paste Share/Workflows/Integrate into an ops tool).
6. **Light-first, dark-ready.** Ship a polished light theme; structure tokens so dark is a `.dark` scope swap, not a rewrite.
7. **Governance is visible** (for enterprise/regulated apps). Classify data, mask PII by default behind an authorization control, reference authoritative systems rather than duplicating them.

## Quickstart (drop-in order)

1. **Tokens** → copy `references/design-tokens.css` into your global stylesheet (e.g. `src/styles.css`). It defines the palette, type ramp, spacing, elevation, radii, focus ring, and the `.dark` scope, plus the Segoe UI font stack.
2. **Icons** → copy `references/icon-component.ts` as `<ui-icon>`. Add the glyphs you need with the unpkg recipe in that file (fetch `@fluentui/svg-icons`).
3. **Dark mode** → copy `references/theme-service.ts`; inject it once at the app root so the saved theme applies on boot.
4. **Shell + surfaces** → follow `references/patterns.md` (command bar + left rail, master-detail, table with paging, wizard, notifications, settings).
5. **Before you finish** → run `references/gotchas.md` — a short checklist of pitfalls that cost real debugging time (base href, undefined tokens, router-outlet sizing, the theme DI token, deep-link boot).

## The token system (essentials)

- **Primitives:** Accenture purple ramp `--acn-05 … --acn-95` (core `--acn-50 = #A100FF`, deep `--acn-70 = #7500C0`, darkest `--acn-90 = #460073`), Fluent neutral greys, and status hues (green/amber/red/blue).
- **Semantics:** `--brand` (fills), `--accent` (interactive text/icons), `--accent-weak` (selected/tint), `--chrome-*` (top bar), `--surface`/`--surface-2/3`, `--bg`, `--border`/`--border-strong`, `--text`/`--muted`/`--faint`, status `--ok/--warn/--danger/--info/--idle` (+ `-weak` tints).
- **Scales:** type `--fs-100…--fs-700` (Segoe UI ramp), spacing `--s-2…--s-40` (4px grid — **only reference values that exist**; an undefined `var()` silently zeroes the whole property), radii `--radius-sm/…/--radius-xl/--radius-pill`, elevation `--shadow-2/4/8/16/28`.
- **Rule:** if you're typing a hex value in a component, stop — add or use a token instead.

## Icons

`<ui-icon name="…" [size]="20" />` renders an inline SVG with `fill: currentColor`, so it inherits text colour and theming. To add a glyph: fetch the path from `https://unpkg.com/@fluentui/svg-icons/icons/<snake_name>_24_regular.svg`, paste the inner `<path>` into the component's `REGISTRY`, and add the name to the `IconName` union. Prefer the `_regular` weight; use `_filled` for active/selected states (e.g. the active nav item). Never install `lucide-angular` on Angular 22 — its peer range lags; vendor inline instead.

## App shell

- **Top command bar** (plum, `--chrome-*`): brand mark + wordmark (links home), centered global search, right cluster (governance toggle, notifications bell, settings, help, avatar). Height `--chrome-h` (48px).
- **Left navigation rail:** icon + label items, active state = filled icon + `--accent` text + a brand accent bar; collapsible to icons-only. Use `routerLink` + `routerLinkActive`; swap regular→filled icon via a `#rla="routerLinkActive"` template ref.
- **Router:** adopt `@angular/router` with `provideRouter(routes, withComponentInputBinding())`. Deep-linkable routes. Keep `<base href="/">` in `index.html` (see gotchas).
- Detail on `references/patterns.md`.

## Surface patterns (see references/patterns.md)

- **Master-detail** (email/triage): nested route (`/thing` + child `/thing/:id`), list always visible, child fills the reading pane. Good for *acting on* items.
- **Data table + server-style paging:** a `queryCases`-style pure query (filter/search/sort/paginate) that mirrors a real `GET …?page=` API; render one page; sticky header; row → detail route. Good for *scanning many*. Put the table in an elevated card over the page background.
- **Overview dashboard:** KPI tiles + a distribution bar + "needs attention" / "upcoming" shortlists. The reporting/landing surface.
- **Wizard / modal:** multi-step form with per-step validation (structured intake), scrim + centered dialog.
- **Notifications bell:** a popover event feed, unread vs a persisted last-seen; distinct from any task/action queue.
- **Settings:** sectioned page — Appearance (theme), Governance & data, configuration, integrations.
- **Chips, buttons, empty states, elevated containers:** consistent tokens (see patterns).

## Dark mode

`ThemeService` toggles a `.dark` class on `<html>`; the `.dark` scope in the token file overrides semantics. Persist the preference. **Use the `document` global, not the `DOCUMENT` DI token** (mismatches and throws `NG0201` on recent Angular). Offer Light / Dark / System.

## Gotchas checklist — read `references/gotchas.md` before shipping

Quick version: `<base href="/">` present · every `var(--token)` is defined · no `main > *` rule that hits `<router-outlet>` · `ViewEncapsulation.None` component hosts have explicit height · theme uses `document` not `DOCUMENT` · no emojis · brand purple only on fills · contrast checked · verified deep-link boot + dark mode in the browser.

## Build order

1. Tokens → icons → theme service (foundation).
2. Shell: command bar + rail + router + `<base href>`.
3. Surfaces in priority order; reuse the patterns.
4. Verify in a browser: light + dark, a hard-refresh on a deep route, and the primary flows. Then build (`ng build`) to confirm a clean compile.
