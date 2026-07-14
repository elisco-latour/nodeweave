# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets) —
it drives per-package semantic versioning and changelogs for the `@nodeweave/*`
packages.

**When you make a change that should ship**, add a changeset:

```bash
pnpm changeset
```

Pick the affected package(s), the bump type (patch / minor / major), and write a
one-line summary — that line becomes the release note. Commit the generated
`.changeset/*.md` file with your PR.

On merge to `main`, CI opens (or updates) a **"Version Packages"** PR that applies
the bumps and updates each `CHANGELOG.md`. Merging that PR publishes the changed
packages to npm. See `RELEASING.md`.
