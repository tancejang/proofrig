// Repo-quality rubric for proofrig: 10 dimensions, each scored 0-10 from weighted binary checks;
// the repo score is their mean. Items are tagged base (must not regress), A (this feature) or
// B (feature B: tests and enforcement). Node stdlib only.
// Usage: node specs/docs-skill-reliability/checks/score.mjs [--only ID,ID] [--require A|B] [--min N]
// Exit 1 if an --only item fails, if any base/required-feature item fails, or if score < --min.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const run = (cmd, args, input) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', input, timeout: 180_000, shell: process.platform === 'win32' && cmd === 'claude' });
// Text of a "## Heading" section, up to the next "## ".
const section = (md, re) => {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^## /.test(l) && re.test(l));
  if (i < 0) return '';
  const j = lines.findIndex((l, k) => k > i && /^## /.test(l));
  return lines.slice(i, j < 0 ? undefined : j).join('\n');
};
const lineWith = (text, ...res) => text.split('\n').some((l) => res.every((re) => re.test(l)));

const SHIP = 'plugins/proofrig/skills/ship/SKILL.md';
const INIT = 'plugins/proofrig/skills/init/SKILL.md';
const TEMPLATES = 'plugins/proofrig/skills/init/references/templates.md';
const MANIFEST = 'plugins/proofrig/.claude-plugin/plugin.json';
const CHANGELOG = 'plugins/proofrig/CHANGELOG.md';
const REPO_URL = 'github.com/tancejang/proofrig';

let validateOut;
const validate = () => {
  if (validateOut === undefined) {
    const r = run('claude', ['plugin', 'validate', '.']);
    validateOut = { ok: r.status === 0, text: `${r.stdout ?? ''}${r.stderr ?? ''}` };
  }
  return validateOut;
};
let hooksOk;
const hookTests = () => (hooksOk ??= run(process.execPath, ['harness/golden-tasks/hooks.test.mjs']).status === 0);
const guard = (input) => run(process.execPath, ['.claude/hooks/guard.mjs'], input);
const manifest = () => { try { return JSON.parse(read(MANIFEST)); } catch { return {}; } };

const ITEMS = [
  // D1 README (user docs)
  { id: 'b1', dim: 1, w: 7, tag: 'base', what: 'README has install, quick start, and both commands',
    ok: () => { const r = read('README.md'); return /claude plugin install proofrig/.test(r) && /^## Quick start/m.test(r) && r.includes('/proofrig:init') && r.includes('/proofrig:ship'); } },
  { id: 'A10', dim: 1, w: 1, tag: 'A', what: 'README Troubleshooting section with at least 4 entries',
    ok: () => (section(read('README.md'), /Troubleshooting/).match(/^\s*[-*] /gm) ?? []).length >= 4 },
  { id: 'A11', dim: 1, w: 1, tag: 'A', what: 'README shows an example /goal line in a code block',
    ok: () => /```text\n(?:[^`]*\n)*?Implement .*specs\/[^\n]*SPEC\.md/.test(read('README.md')) },
  { id: 'A12', dim: 1, w: 0.5, tag: 'A', what: 'README repo layout lists harness/, .claude/, CLAUDE.md, CHANGELOG.md',
    ok: () => { const s = section(read('README.md'), /Repo layout/); return ['harness/', '.claude/', 'CLAUDE.md', 'CHANGELOG.md'].every((t) => s.includes(t)); } },
  { id: 'A13', dim: 1, w: 0.5, tag: 'A', what: 'README E2E section states prerequisites (auth, model, Git Bash, duration)',
    ok: () => { const s = section(read('README.md'), /E2E/); return /PROOFRIG_E2E_MODEL/.test(s) && /PROOFRIG_BASH/.test(s) && /(logged in|authenticated)/i.test(s) && /Git Bash/.test(s) && /minutes/.test(s); } },

  // D2 contributor docs
  { id: 'b2', dim: 2, w: 5, tag: 'base', what: 'root CLAUDE.md lists commands',
    ok: () => /^## Commands/m.test(read('CLAUDE.md')) && read('CLAUDE.md').includes('hooks.test.mjs') },
  { id: 'A9', dim: 2, w: 3, tag: 'A', what: 'README "Developing proofrig" section: validate, hook tests, PROOFRIG_UNLOCK=1',
    ok: () => { const s = section(read('README.md'), /Develop/); return s.includes('claude plugin validate .') && s.includes('node harness/golden-tasks/hooks.test.mjs') && s.includes('PROOFRIG_UNLOCK=1'); } },
  { id: 'A15', dim: 2, w: 2, tag: 'A', what: 'CHANGELOG has 0.1.2, 0.1.1, 0.1.0 (newest first) and matches plugin.json version',
    ok: () => { const v = [...read(CHANGELOG).matchAll(/^## \[?(\d+\.\d+\.\d+)/gm)].map((m) => m[1]); return v.slice(0, 3).join() === '0.1.2,0.1.1,0.1.0' && manifest().version === v[0]; } },

  // D3 skill consistency (PROJ-5)
  { id: 'b3', dim: 3, w: 7, tag: 'base', what: '`claude plugin validate .` passes', ok: () => validate().ok },
  { id: 'A1', dim: 3, w: 2, tag: 'A', what: 'ship points to templates.md relative to its own base directory, and the file exists',
    ok: () => { const s = read(SHIP); return s.includes('../init/references/templates.md') && /base directory/i.test(s) && !/[`(]skills\/init\/references/.test(s) && exists(TEMPLATES); } },
  { id: 'A5', dim: 3, w: 1, tag: 'A', what: 'ship names a concrete spec location (no "location the harness defines")',
    ok: () => !/location the harness defines/.test(read(SHIP)) && read(SHIP).includes('specs/<feature>/SPEC.md') },

  // D4 skill robustness
  { id: 'b4', dim: 4, w: 6, tag: 'base', what: 'init keeps the e2e gate and writes settings.json last',
    ok: () => { const s = read(INIT); return /## Phase 4: E2E gate/.test(s) && /Write `\.claude\/settings\.json` last/.test(s); } },
  { id: 'A2', dim: 4, w: 1, tag: 'A', what: 'ship: an existing .locked stops the skill and tells the human',
    ok: () => lineWith(read(SHIP), /\.locked/, /already exists/i, /stop/i) },
  { id: 'A3', dim: 4, w: 0.5, tag: 'A', what: 'ship: an existing unlocked spec is resumed, not overwritten',
    ok: () => lineWith(read(SHIP), /SPEC\.md/, /already exists/i, /(resume|do not overwrite)/i) },
  { id: 'A4', dim: 4, w: 0.5, tag: 'A', what: 'ship: slow or costly checks (live model) need user confirmation before the fail-first run',
    ok: () => lineWith(read(SHIP), /(too slow|costly|live model)/i, /(ask|confirm)/i) },
  { id: 'A6', dim: 4, w: 1, tag: 'A', what: 'init: generated hook commands are cross-platform (node "$CLAUDE_PROJECT_DIR/...", Git Bash)',
    ok: () => { const s = read(INIT); return s.includes('node "$CLAUDE_PROJECT_DIR/') && /Git Bash/.test(s); } },
  { id: 'A7', dim: 4, w: 0.5, tag: 'A', what: 'init: PreToolUse hook fails closed on unparsable input',
    ok: () => lineWith(read(INIT), /(unparsable|malformed|invalid|empty) (input|stdin)/i, /(block|exit 2|fail closed)/i) },
  { id: 'A8', dim: 4, w: 0.5, tag: 'A', what: 'templates: golden tasks include a read-only command on a protected path that must be allowed',
    ok: () => lineWith(read(TEMPLATES), /read-only command/i, /(allowed|not blocked)/i) },

  // D5 manifests
  { id: 'b5', dim: 5, w: 8, tag: 'base', what: 'manifests parse and validate', ok: () => validate().ok && !!manifest().name },
  { id: 'A14', dim: 5, w: 2, tag: 'A', what: 'plugin.json has author, repository, homepage; validate has no warnings',
    ok: () => { const m = manifest(); return !!m.author?.name && String(m.repository ?? '').includes(REPO_URL) && String(m.homepage ?? '').includes(REPO_URL) && validate().ok && !/warning/i.test(validate().text); } },

  // D6 behavioral test coverage
  { id: 'b6', dim: 6, w: 5, tag: 'base', what: 'init e2e exists and hook golden tests pass',
    ok: () => read('e2e/run.mjs').includes('/proofrig:init') && hookTests() },
  { id: 'B6', dim: 6, w: 3, tag: 'B', what: 'e2e covers /proofrig:ship', ok: () => read('e2e/run.mjs').includes('/proofrig:ship') },
  { id: 'B7', dim: 6, w: 2, tag: 'B', what: 'e2e asserts generated hooks are cross-platform',
    ok: () => /check\(\s*['`"][^'`"]*cross-platform/i.test(read('e2e/run.mjs')) },

  // D7 hook correctness
  { id: 'b7', dim: 7, w: 7, tag: 'base', what: 'hook golden tests pass', ok: () => hookTests() },
  { id: 'B1', dim: 7, w: 1.5, tag: 'B', what: 'guard allows a read of a protected path with 2>&1',
    ok: () => guard(JSON.stringify({ tool_name: 'Bash', cwd: ROOT, tool_input: { command: 'ls 2>&1; cat harness/CLAUDE.md' } })).status === 0 },
  { id: 'B2', dim: 7, w: 1, tag: 'B', what: 'guard blocks (exit 2) on empty input', ok: () => guard('').status === 2 },
  { id: 'B3', dim: 7, w: 0.5, tag: 'B', what: 'hook tests copy .github/ into the scratch repo',
    ok: () => !read('harness/golden-tasks/hooks.test.mjs').includes('includes(`${path.sep}.git`)') },

  // D8 CI
  { id: 'b8', dim: 8, w: 2, tag: 'base', what: 'Stop hook runs validate and syntax checks', ok: () => /plugin', 'validate/.test(read('.claude/hooks/stop.mjs')) },
  { id: 'B4', dim: 8, w: 8, tag: 'B', what: 'CI workflow runs hook tests, node --check, plugin validate',
    ok: () => { const d = path.join(ROOT, '.github/workflows'); const t = fs.existsSync(d) ? fs.readdirSync(d).map((f) => read(`.github/workflows/${f}`)).join('\n') : ''; return t.includes('hooks.test.mjs') && t.includes('node --check') && t.includes('plugin validate'); } },

  // D9 release hygiene
  { id: 'b9', dim: 9, w: 4, tag: 'base', what: 'plugin.json carries a semver version', ok: () => /^\d+\.\d+\.\d+$/.test(manifest().version ?? '') },
  { id: 'A15r', dim: 9, w: 4, tag: 'A', what: 'CHANGELOG matches the released version (same check as A15)', ok: () => ITEMS.find((i) => i.id === 'A15').ok() },
  { id: 'B5', dim: 9, w: 2, tag: 'B', what: '.gitignore exists', ok: () => exists('.gitignore') },

  // D10 basics
  { id: 'b10', dim: 10, w: 10, tag: 'base', what: 'MIT LICENSE present', ok: () => /MIT License/.test(read('LICENSE')) },
];

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const only = arg('--only')?.split(',');
const require = arg('--require');
const min = arg('--min') === undefined ? undefined : Number(arg('--min'));

const results = ITEMS.filter((i) => !only || only.includes(i.id)).map((i) => {
  let pass = false;
  try { pass = !!i.ok(); } catch {}
  console.log(`${pass ? 'PASS' : 'FAIL'} [${i.tag}] ${i.id} D${i.dim} w${i.w}  ${i.what}`);
  return { ...i, pass };
});

let failed = false;
if (only) failed = results.some((r) => !r.pass);
else {
  const dims = [...new Set(ITEMS.map((i) => i.dim))].map((d) => {
    const rs = results.filter((r) => r.dim === d);
    return 10 * rs.filter((r) => r.pass).reduce((s, r) => s + r.w, 0) / rs.reduce((s, r) => s + r.w, 0);
  });
  const score = dims.reduce((a, b) => a + b, 0) / dims.length;
  console.log(`\ndimensions: ${dims.map((d, i) => `D${i + 1}=${d.toFixed(1)}`).join(' ')}\nscore: ${score.toFixed(2)} / 10`);
  if (results.some((r) => !r.pass && (r.tag === 'base' || r.tag === require))) { console.log('required items failing'); failed = true; }
  if (min !== undefined && score < min) { console.log(`score below ${min}`); failed = true; }
}
process.exit(failed ? 1 : 0);
