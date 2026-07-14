# Gotchas — read before shipping

Each of these cost real debugging time on an Accenture Fluent Angular build. Skim before you finish a surface, and verify the starred (★) ones in a browser.

## ★ 1. Deep-link black screen → missing `<base href="/">`
**Symptom:** app boots fine at `/inbox` but a hard refresh on a depth-2 route (`/cases/RW-1042`, `/inbox/42`) shows a black/blank screen; the tab title stays as the raw URL; `document.querySelector('app-root').children.length === 0`.
**Cause:** without `<base href="/">`, the browser resolves `main.js` relative to `/cases/` → `/cases/main.js` → 404 → Angular never boots. Depth-1 routes coincidentally work.
**Fix:** add `<base href="/">` to `<head>` in `index.html`. Always. Verify by hard-refreshing a nested route.

## ★ 2. Undefined CSS variable silently zeroes the property
**Symptom:** a button/element has no padding/gap even though the rule "looks right".
**Cause:** `padding: 0 var(--s-14)` where `--s-14` isn't defined → the *entire* `padding` declaration is invalid → falls back to `0`.
**Fix:** only reference tokens that exist (the spacing scale has no `--s-14`; use `--s-12`/`--s-16`). When something has unexpectedly-collapsed spacing, grep the file for the token names and confirm each is defined.

## ★ 3. `main > *` matches the router-outlet
**Symptom:** routed content renders in the DOM but is pushed entirely below the fold (blank main).
**Cause:** `<router-outlet>` is part of the shell component's template, so with emulated encapsulation `main > * { height: 100% }` matches the *outlet element* (0-size marker) and stretches it, shoving the routed sibling down.
**Fix:** don't size `main > *`. Set `main { overflow-y: auto }` and let each routed component own its height (`:host { height: 100%; min-height: 0 }`).

## 4. `ViewEncapsulation.None` component host has no intrinsic height
**Symptom:** a canvas/map/chart inside a `None`-encapsulated component renders blank (0-height).
**Cause:** the custom-element host defaults to `display: inline`; a child `height: 100%` resolves against a 0-height host. `:host` doesn't work under `None`.
**Fix:** add a plain global rule for the host tag in that component's styles, e.g. `my-map { display: block; height: 100%; }`, and ensure the parent gives it a definite height.

## ★ 5. Theme service: use `document`, not the `DOCUMENT` DI token
**Symptom:** `NG0201: No provider found for InjectionToken DocumentToken` on boot; dark mode never applies.
**Cause:** injecting `DOCUMENT` from `@angular/common` mismatches the platform token on recent Angular.
**Fix:** use the `document` global in the theme effect (see `theme-service.ts`). Note: console error buffers persist across reloads — if dark mode actually toggles, a lingering NG0201 is a *stale* entry from a prior bundle; hard-refresh to clear.

## 6. Don't add `lucide-angular` on Angular 22
Its peer range lags (declares ≤21) → install friction/warnings. Vendor **Fluent System Icons** inline instead (`icon-component.ts`). No emojis anywhere.

## 7. Nested router-outlet must exist when the child route activates
**Symptom:** navigating to a child route renders nothing (or races) when the outlet is inside a `@if` that only becomes true *after* NavigationEnd.
**Fix:** keep the `<router-outlet>` always present in the DOM; toggle surrounding layout/visibility with CSS, not by conditionally removing the outlet.

## 8. Accessibility: `#A100FF` is not a text colour
`#A100FF` on white fails WCAG AA for normal text. Use it only for fills/identity; use `--accent` (`#7500C0`, ~8:1) for interactive text/icons. Check contrast whenever purple sits on a light surface.

## 9. Angular zoneless + signals hygiene
- Components: `standalone`, `ChangeDetectionStrategy.OnPush`, state in `signal()`, derived in `computed()`.
- DOM/side-effects (theme class, scroll-to, focus) in `effect()`.
- Route params → component inputs need `withComponentInputBinding()`.
- Route `title` sets the tab title via the default TitleStrategy — set it per route.

## 10. Don't fork shared/vendored libraries for looks
If a shared component renders text where you want a rich icon (e.g. a palette), build a small local version from the library's *public* API rather than editing the library. Keeps upgrades clean.

## 11. Don't persist large synthetic datasets
Seeding thousands of mock records into `localStorage` bloats storage and slows boot. Keep the default seed tiny; make scale/demo data an **opt-in dev hook** (`window.appSeed(n)`) that's generated on demand, and provide a reset.

## Final verification (do this, don't assume)
- Run the app; exercise the primary flows.
- Toggle **dark mode** and confirm the whole app re-themes.
- **Hard-refresh a nested route** (proves `<base href>`).
- `ng build` → clean compile (no template/type errors).
- Automated form typing note: synthetic `form_input`/value-set may not fire Angular's `(input)`; drive inputs with real keystrokes or dispatch a real `input` event when testing.
