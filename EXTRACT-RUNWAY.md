# Extracting the Runway app into its own repository

The **Runway** app (previously `apps/runway`) has been removed from this
package repository. This guide extracts it — **with its full git history** —
into a standalone repo. Runway is a private Accenture application; it does **not**
share the packages' ISC license.

> This repo still contains Runway in its **history** (up to the removal commit),
> so you can run this extraction at any time from a clone. Delete this file from
> the package repo once the split is done.

## 1. Extract with history (`git filter-repo`)

Requires [`git-filter-repo`](https://github.com/newren/git-filter-repo)
(`pip install git-filter-repo` or `brew install git-filter-repo`).

```bash
# Work on a FRESH clone — filter-repo rewrites history destructively.
git clone <this-repo-url> runway-extract
cd runway-extract

# Keep only apps/runway's history and move it to the repo root.
git filter-repo --path apps/runway/ --path-rename apps/runway/:

# You now have a repo whose root is the former apps/runway.
```

## 2. Create the new remote and push

```bash
git remote add origin <new-runway-repo-url>   # GitLab/GitHub, private
git push -u origin main --tags
```

## 3. Make it standalone

The app consumed the packages via the workspace (`workspace:*`), which no longer
resolves outside the monorepo. In the new repo:

- **Depend on the published packages** in `package.json` — replace each
  `"@nodeweave/…": "workspace:*"` with a real range once they're on npm:
  ```jsonc
  "@nodeweave/angular": "^0.1.0",
  "@nodeweave/angular-authoring": "^0.1.0",
  "@nodeweave/core": "^1.0.0"
  ```
  (During local dev before publish, use `pnpm link` / a file: dependency / a
  packed tarball.)
- Add a **root `pnpm-workspace.yaml`** only if Runway itself becomes a workspace;
  otherwise a plain single-package repo is fine.
- Add a **proprietary `LICENSE`** (Accenture internal) — not ISC.
- Bring its own **CI** (build + the Vitest/Playwright suites already under
  `e2e/`), and its **SSO/BFF backend** per `BACKEND-HANDOFF.md`.
- `<base href="/">` must stay in `index.html` (deep-link boot).

## 4. (Optional) Scrub Runway from this repo's history

The package repo still carries Runway in history. To remove it entirely (this
**rewrites history** and needs a force-push + fresh clones for everyone):

```bash
git filter-repo --invert-paths --path apps/runway/
git push --force-with-lease
```

Skip this unless you specifically need the history gone (e.g. licensing).
