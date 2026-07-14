# Releasing

The `@build744/*` packages are versioned and published independently with
[Changesets](https://github.com/changesets/changesets) and published to the
public npm registry from CI.

Published packages:

| Package | Build | Published artifact |
|---|---|---|
| `@build744/nodeweave-core` | `tsc` | package root (`files: ["dist", …]`) |
| `@build744/nodeweave-angular` | `ng-packagr` | `packages/angular/dist/` |
| `@build744/nodeweave-angular-authoring` | `ng-packagr` | `packages/angular-authoring/dist/` |

Examples (`@build744/example-*`) and the docs site (`@build744/website`) are
`private` and never published.

## 1. Add a changeset with your change

```bash
pnpm changeset
```

Pick the affected package(s), the bump (patch / minor / major), and write a
one-line summary — that becomes the release note. Commit the generated
`.changeset/*.md` with your PR. Skip this only for changes that don't affect a
published package (docs, examples, CI).

## 2. Merge to `main` → automated release

The **Release** workflow (`.github/workflows/release.yml`) runs on every push to
`main`:

1. **Build + unit tests + the dry-run gate** (`pnpm verify:packages`) — must pass.
2. If there are **pending changesets** → it opens/updates a **"Version Packages"**
   PR that applies the version bumps and updates each `CHANGELOG.md`.
3. When that PR is **merged** (no pending changesets) → it **publishes** the
   changed packages to npm (with provenance) and creates a git tag +
   GitHub release per package (`@build744/x@1.2.3`).

Publishing is idempotent — a version already on npm is skipped, so re-runs are safe.

## The dry-run gate (`pnpm verify:packages`)

Run it locally before opening a PR — it's the same check CI gates on:

```bash
pnpm build
pnpm verify:packages
```

For each package it packs the **exact** artifact that would ship and asserts:
the tarball contains `package.json` + `README` + `LICENSE` + compiled code +
`.d.ts` and **leaks no** `src`/`tests`/`examples`/`.claude`/tooling; then runs
`publint` (fatal) and `attw` (advisory).

## One-time setup — npm Trusted Publishing (OIDC, tokenless)

Publishing is **tokenless**: no `NPM_TOKEN` secret. CI authenticates with npm via
the workflow's OIDC id-token, so each package needs a trusted publisher on
npmjs.com. A package must exist on npm before you can configure it, so the very
first `0.1.0` publish was done token-based; every release since is tokenless.

For **each** package (`@build744/nodeweave-core`, `-angular`, `-angular-authoring`):

1. npmjs.com → the package → **Settings** → **Trusted Publisher** → **GitHub Actions**.
2. Organization/user `elisco-latour`, repository `nodeweave`, workflow `release.yml`
   (leave the environment blank unless the job sets one).

Also:

- The scope must allow public publishing (each package already sets
  `publishConfig.access: "public"`).
- The workflow needs `id-token: write` (already set) and a recent npm — the
  `release.yml` step `npm install --global npm@latest` guarantees `>= 11.5.1`.
- Provenance is signed with the same OIDC token (`NPM_CONFIG_PROVENANCE: true`).

Once all three trusted publishers are configured, the classic `NPM_TOKEN` secret
can be deleted.
