/**
 * Pre-publish verification (the release dry-run gate).
 *
 * For each publishable @nodeweave package, packs the exact artifact that will be
 * published — `@build744/nodeweave-core` from its root (files allowlist), the Angular
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
  { name: '@build744/nodeweave-core', packDir: 'packages/core' },
  { name: '@build744/nodeweave-angular', packDir: 'packages/angular/dist' },
  { name: '@build744/nodeweave-angular-authoring', packDir: 'packages/angular-authoring/dist' },
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

/**
 * Extract the first complete top-level JSON value (object or array) from npm's
 * stdout.
 *
 * `npm pack --json` output has shifted across npm versions and newer npm can
 * append extra content after the JSON (notices, a second document). A naive
 * `slice(indexOf('['), lastIndexOf(']'))` grabs a stray `]` and leaves trailing
 * text that `JSON.parse` rejects. Scan bracket depth (string-aware) from the
 * first `[`/`{` and stop at its matching close.
 */
function firstJsonValue(out) {
  const start = out.search(/[[{]/);
  if (start === -1) throw new Error(`no JSON in npm output:\n${out.slice(0, 300)}`);
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < out.length; i++) {
    const c = out[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { if (--depth === 0) return out.slice(start, i + 1); }
  }
  throw new Error(`unterminated JSON in npm output:\n${out.slice(start, start + 300)}`);
}

/**
 * The list of packed file paths from `npm pack --dry-run --json`, normalized
 * across npm's two output shapes:
 *   npm < 12: [ { files: [...], … } ]
 *   npm ≥ 12: { "<pkg-name>": { files: [...], … } }
 */
function packedFiles(out) {
  const parsed = JSON.parse(firstJsonValue(out));
  const entry = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
  if (!entry || !Array.isArray(entry.files)) {
    throw new Error(`unexpected npm pack --json shape: ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  return entry.files.map((f) => f.path.replace(/\\/g, '/'));
}

let failed = false;
const fail = (m) => { console.error(`  ✗ ${m}`); failed = true; };
const pass = (m) => console.log(`  ✓ ${m}`);

for (const pkg of PACKAGES) {
  console.log(`\n── ${pkg.name}  (${pkg.packDir}) ──`);

  // 1) Tarball contents
  let files;
  try {
    const out = execSync('npm pack --dry-run --json', { cwd: pkg.packDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    files = packedFiles(out);
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
