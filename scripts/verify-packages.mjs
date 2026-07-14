/**
 * Pre-publish verification (the release dry-run gate).
 *
 * For each publishable @nodeweave package, packs the exact artifact that will be
 * published — `@build744/core` from its root (files allowlist), the Angular
 * libraries from their ng-packagr `dist/` — and:
 *   1. asserts the tarball contains only the built artifact (README + LICENSE +
 *      package.json + compiled code) and leaks NO source / tests / examples /
 *      tooling;
 *   2. runs `publint` (fatal) — package.json fields + exports resolve;
 *   3. runs `attw` (advisory) — "are the types wrong" for consumers.
 *
 * Run AFTER `pnpm build`. Non-zero exit on any (1)/(2) failure so CI can gate
 * the real publish on it.
 */
import { execSync } from 'node:child_process';

// packDir = the directory whose package.json is the published manifest.
const PACKAGES = [
  { name: '@build744/core', packDir: 'packages/core' },
  { name: '@build744/angular', packDir: 'packages/angular/dist' },
  { name: '@build744/angular-authoring', packDir: 'packages/angular-authoring/dist' },
];

const REQUIRE = [
  { label: 'package.json', re: /^package\.json$/ },
  { label: 'README.md', re: /^readme\.md$/i },
  { label: 'LICENSE', re: /^licen[sc]e$/i },
  { label: 'compiled code (dist/ | fesm2022/ | *.js)', re: /(^dist\/|^fesm2022\/|\.m?js$)/ },
  { label: 'type declarations (*.d.ts)', re: /\.d\.ts$/ },
];
const FORBID = [
  /^src\//, /^tests?\//, /^examples?\//, /^\.claude\//, /^node_modules\//,
  /(^|\/)tsconfig[^/]*\.json$/, /(^|\/)ng-package\.json$/, /\.spec\.[tj]s$/,
];
const isRawTs = (p) => /\.ts$/.test(p) && !/\.d\.ts$/.test(p);

let failed = false;
const fail = (m) => { console.error(`  ✗ ${m}`); failed = true; };
const pass = (m) => console.log(`  ✓ ${m}`);

for (const pkg of PACKAGES) {
  console.log(`\n── ${pkg.name}  (${pkg.packDir}) ──`);

  // 1) Tarball contents
  let files;
  try {
    const out = execSync('npm pack --dry-run --json', { cwd: pkg.packDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const json = out.slice(out.indexOf('['), out.lastIndexOf(']') + 1);
    files = JSON.parse(json)[0].files.map((f) => f.path.replace(/\\/g, '/'));
  } catch (e) {
    fail(`npm pack failed: ${e.message}`);
    continue;
  }
  for (const req of REQUIRE) {
    if (!files.some((f) => req.re.test(f))) fail(`missing required: ${req.label}`);
  }
  const leaks = files.filter((f) => FORBID.some((re) => re.test(f)) || isRawTs(f));
  if (leaks.length) fail(`tarball leaks non-package files: ${leaks.slice(0, 10).join(', ')}`);
  else pass(`tarball clean (${files.length} files)`);

  // 2) publint — fatal
  try {
    execSync('pnpm exec publint', { cwd: pkg.packDir, stdio: 'inherit' });
    pass('publint');
  } catch {
    fail('publint reported problems');
  }

  // 3) are-the-types-wrong — advisory (Angular ESM-only libs can raise benign notes)
  try {
    execSync('pnpm exec attw --pack . --profile esm-only', { cwd: pkg.packDir, stdio: 'inherit' });
    pass('are-the-types-wrong');
  } catch {
    console.warn('  ! are-the-types-wrong reported issues (advisory — review, not blocking)');
  }
}

if (failed) {
  console.error('\nPackage verification FAILED.');
  process.exit(1);
}
console.log('\nAll packages verified. ✅');
