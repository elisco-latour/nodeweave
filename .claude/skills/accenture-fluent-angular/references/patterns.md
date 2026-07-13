# Fluent + Accenture — Angular UI patterns

Reusable surface patterns. Sketches, not full files — adapt names/prefixes. All
consume the semantic tokens from `design-tokens.css` and `<ui-icon>`.

## App shell — command bar + left rail + router

Grid: `chrome (48px) / [rail | main]`. Adopt the Router.

```ts
// main.ts
provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))
```

- **Command bar** (`--chrome-*`, a subtle `linear-gradient(100deg, var(--chrome-bg), var(--chrome-bg-2))`):
  brand (links `/`), centered search, right cluster (governance/PII toggle, `<ui-notifications>`, settings gear → `routerLink`, help, avatar). Icon buttons: 34px, `color: var(--chrome-fg-muted)`, hover `background: var(--chrome-hover)`.
- **Left rail:** nav items as `<a routerLink routerLinkActive="active">`. Swap the icon regular→filled on active with a template ref:

```html
<a class="nav-item" [routerLink]="'/'+item.id" routerLinkActive="active" #rla="routerLinkActive">
  <ui-icon [name]="rla.isActive ? item.iconActive : item.icon" [size]="20" />
  <span class="nav-label">{{ item.label }}</span>
</a>
```
Active item = `background: var(--accent-weak); color: var(--accent)` + a 3px `--brand` bar (`::before`). Collapsible to `--rail-w-collapsed` (hide `.nav-label`).
- **main**: `overflow-y: auto`. Do **not** write `main > * { height: 100% }` — it hits `<router-outlet>` (see gotchas). Let routed components size themselves (`:host { height: 100%; min-height: 0 }`).

## Master-detail (act on items: inbox / triage / queue)

Nested route so the detail is deep-linkable while the list stays visible.

```ts
{ path: 'inbox', component: InboxComponent, children: [
  { path: ':id', component: ItemDetailComponent } ] }
```
- Parent renders: page header + `[list 380px | pane]`. The pane always contains `<router-outlet />`; show a "select an item" prompt when no child is active (derive `activeId` from the router URL via `toSignal(router.events…)`).
- List rows: `<a [routerLink]="['/inbox', it.id]" routerLinkActive="sel">`. Show all items (done ones greyed) for auditability; disable action buttons once actioned and show a status stamp.
- Detail child binds the route param via `input.required<string>()` (needs `withComponentInputBinding`).

## Data table + server-style paging (scan many)

Keep rendering to ONE page; push filter/search/sort/paginate through a pure query that mirrors a real API (`GET /x?filter=&sort=&page=`), so the mock→backend seam is honest.

```ts
export function query<T>(all: T[], q: { search?; filter?; sort?; page?; pageSize? }): {
  rows: T[]; total: number; matched: number; page: number; pageCount: number;
} { /* filter → search → sort → slice */ }
```
- Put the table in an **elevated card** (`background: var(--surface); border; border-radius: var(--radius-lg); box-shadow: var(--shadow-4)`) that floats over the page (`--bg`), with a calm page header above and a command bar (New / Refresh / Export CSV / a "Filter this list" box / Sort + Filter pickers).
- `thead th { position: sticky; top: 0; background: var(--surface-2) }`. Rows `(click)` → detail route. Pager footer: "X–Y of N" + prev/next.
- **Don't** also keep a narrow master-detail list of the same data — a table is the scanning tool; a full detail page is the drill-in. Pick per surface.

## Overview dashboard (landing / reporting)

Max-width container. A row of **KPI tiles** (label + big number + `<ui-icon>` in a toned circle, each a `routerLink`), an **overall bar + distribution legend**, then two columns: "Needs attention" and "Upcoming". Derive everything from data with `computed()`. This is *reporting*, distinct from any action queue.

## Wizard / modal (structured intake)

Scrim + centered dialog (`position: fixed; inset: 0`). Multi-step: a stepper, per-step validation (block Next + show inline errors), a Review step, then submit. For "create" flows this IS the structured intake — explicit fields, never free text. `@keyframes pop` for a subtle entrance.

## Notifications bell (ambient awareness)

A bell (`alert` icon) in the command bar with an unread count badge; popover panel lists a recent-events feed (icon toned by event type, actor, time-ago) → click routes to the relevant record. Unread = events newer than a persisted `lastSeen`; opening the panel marks seen. Keep it distinct from any task/action queue — it's *notice*, not *work*.

## Settings (sectioned page)

Max-width, section cards: **Appearance** (theme segmented Light/Dark/System → `ThemeService`), **Governance & data** (PII authorization toggle switch + a classification data-dictionary table + retention), **Configuration** (per-context editable fields, persisted), **Integrations** (connection-status cards: Connected / Human-assisted / Not configured).

## Small components

- **Chip:** pill, `background: var(--tone-weak); color: var(--tone-strong)`; drive tone via a `[data-tone]` attr mapping to `--ok/--warn/--danger/--info/--idle/--accent`. Optional leading `<ui-icon [size]="13">`.
- **Buttons:** primary `background: var(--brand); color: #fff` (flat, no shadow); secondary/ghost `border: 1px solid var(--border-strong); color: var(--muted)`. **Keep a uniform height (32px) across a command bar** and pad with a *defined* token (`--s-12`).
- **Empty states:** centered icon in a toned circle + one calm sentence.
- **Toggle switch:** 42×24 track, `--border-strong` off / `--brand` on, 18px knob.

## Journey / IA

Give the app a story, one job per surface — e.g. *Home = see · Inbox = act · Records = inspect · Author = build · bell = notice*. Don't scatter components; make navigation follow the user's task flow.
