/**
 * Publish the built @nodeweave packages to npm.
 *
 * Publishes each package's real artifact — `@build744/nodeweave-core` from its root, the
 * Angular libraries from their ng-packagr `dist/` — with npm provenance. Skips a
 * package whose exact version is already on npm (safe to re-run). Prints a
 * `New tag: name@version` line per publish so changesets/action creates the git
 * tag + GitHub release.
 *
 * Run in CI after `pnpm build` (provenance needs the CI OIDC token). Invoked by
 * `pnpm release`.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PACKAGES = [
  { name: '@build744/nodeweave-core', dir: 'packages/core' },
  { name: '@build744/nodeweave-angular', dir: 'packages/angular/dist' },
  { name: '@build744/nodeweave-angular-authoring', dir: 'packages/angular-authoring/dist' },
];

let published = 0;
for (const pkg of PACKAGES) {
  const { name, version } = JSON.parse(readFileSync(`${pkg.dir}/package.json`, 'utf8'));
  const tag = `${name}@${version}`;

  try {
    execSync(`npm view ${name}@${version} version`, { stdio: 'ignore' });
    console.log(`- ${tag} already published — skipping.`);
    continue;
  } catch { /* not on npm yet */ }

  console.log(`Publishing ${tag} …`);
  execSync('npm publish --provenance --access public', { cwd: pkg.dir, stdio: 'inherit' });
  console.log(`New tag: ${tag}`); // parsed by changesets/action → git tag + GitHub release
  published++;
}

console.log(published ? `\nPublished ${published} package(s).` : '\nNothing to publish (all up to date).');
