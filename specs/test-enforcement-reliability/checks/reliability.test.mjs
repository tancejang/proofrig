// Checks for specs/test-enforcement-reliability. One test per requirement, named by ID.
// Shell probes run as a subagent (agent_type 'general-purpose'): the main session (no agent_type)
// skips the shell-write check by design, which would make the guard tests pass vacuously. Node stdlib only.
// Usage: node specs/test-enforcement-reliability/checks/reliability.test.mjs
//        node --test-name-pattern="^R(1|2|3)\b" specs/test-enforcement-reliability/checks/reliability.test.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '');
const env = (extra = {}) => ({ ...process.env, CLAUDE_PROJECT_DIR: ROOT, ...extra });
const guard = (input) => spawnSync(process.execPath, [path.join(ROOT, '.claude/hooks/guard.mjs')], { cwd: ROOT, encoding: 'utf8', input, env: env() });
const sh = (command, agent_type = 'general-purpose') => guard(JSON.stringify({ tool_name: 'Bash', cwd: ROOT, tool_input: { command }, ...(agent_type && { agent_type }) }));
const section = (md, re) => {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^## /.test(l) && re.test(l));
  if (i < 0) return '';
  const j = lines.findIndex((l, k) => k > i && /^## /.test(l));
  return lines.slice(i, j < 0 ? undefined : j).join('\n');
};
const lineWith = (text, ...res) => text.split('\n').some((l) => res.every((re) => re.test(l)));
const VALIDATE_PLUGIN = /plugin validate (--strict )?plugins\/proofrig/;

test('R1 guard allows subagent read-only commands with 2>&1, 2>/dev/null, or a quoted > before a protected path, and writes to unprotected *-harness/ paths', () => {
  for (const c of [
    'ls 2>&1; cat harness/CLAUDE.md',
    'ls 2>/dev/null; cat harness/CLAUDE.md',
    'git log --oneline -3 2>&1 | head; git diff -- harness/CLAUDE.md',
    'gh pr create --base main --title x --body "Spec -> Plan; see harness/CLAUDE.md"',
    'gh pr create --base main --title x --body "a → b, see .claude/hooks/guard.mjs"',
    'ls 2>&1; Get-Content harness/CLAUDE.md',
    'node --check e2e/run.mjs 2>&1',
    'echo x > specs/demo-harness/notes.md',
    'sed -i s/a/b/ plugins/proofrig/README.md specs/zero-restart-harness/notes.md',
  ]) {
    const r = sh(c);
    assert.strictEqual(r.status, 0, `${c}\n${r.stderr}`);
  }
});

test('R2 guard still blocks subagent shell writes to protected paths (and allows them in the main session)', () => {
  for (const c of [
    'echo x > harness/a.md', 'cat a 2>&1 > e2e/x', 'echo x >> .claude/notes', 'echo x > "harness/a.md"',
    'echo hi>harness/a.md', 'echo x 1> e2e/y', 'echo x &> harness/z', 'ls 2>&1; echo x > harness/a.md',
    'echo "->" > harness/a.md', 'node x 2>&1 | tee e2e/log.txt', 'cp a harness/b',
    'sed -i s/a/b/ .claude/hooks/guard.mjs', 'Set-Content harness/a.md x',
  ]) {
    assert.strictEqual(sh(c).status, 2, c);
  }
  assert.strictEqual(sh('echo x > harness/a.md', null).status, 0, 'main session (no agent_type)');
});

test('R3 guard fails closed (exit 2 with a message) on empty or unparsable input', () => {
  for (const input of ['', '   \n', '{not json', 'null']) {
    const r = guard(input);
    assert.strictEqual(r.status, 2, JSON.stringify(input));
    assert.match(r.stderr, /proofrig guard/, `message for ${JSON.stringify(input)}`);
  }
  assert.ok(lineWith(section(read('harness/CLAUDE.md'), /Enforcement/), /(empty|unparsable|invalid)/i, /(exit 2|block|fail)/i), 'harness/CLAUDE.md Enforcement documents fail-closed');
});

test('R4 hook tests copy everything except the .git directory', () => {
  const t = read('harness/golden-tasks/hooks.test.mjs');
  assert.ok(t && !t.includes('includes(`${path.sep}.git`)'), 'old .git substring filter is gone');
  assert.ok(/\.git\b/.test(t), 'still excludes .git');
});

test('R5 golden tests cover the allowed read, the still-blocked writes, and fail-closed input; they pass', () => {
  const t = read('harness/golden-tasks/hooks.test.mjs');
  for (const s of ['ls 2>&1; cat harness/CLAUDE.md', 'echo x > harness/a.md', 'cat a 2>&1 > e2e/x']) assert.ok(t.includes(s), s);
  assert.ok(lineWith(t, /test\(/, /(empty|invalid|unparsable|fail[s -]*closed)/i), 'a fail-closed golden test');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'harness/golden-tasks/hooks.test.mjs')], { cwd: ROOT, encoding: 'utf8', timeout: 600_000 });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

test('R6 CI workflow: ubuntu + windows (Git Bash), pinned native claude, hook tests, syntax checks, strict validate', () => {
  const d = path.join(ROOT, '.github/workflows');
  const t = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.ya?ml$/.test(f)).map((f) => read(`.github/workflows/${f}`)).join('\n') : '';
  assert.ok(t, 'a workflow exists');
  for (const s of ['ubuntu-latest', 'windows-latest', 'node harness/golden-tasks/hooks.test.mjs', 'node --check', 'e2e', '.claude/hooks', 'harness/golden-tasks',
    'claude plugin validate --strict .', 'claude plugin validate --strict plugins/proofrig', '2.1.312']) assert.ok(t.includes(s), s);
  assert.match(t, /shell:\s*bash/, 'bash (Git Bash on Windows)');
  assert.match(t, /claude\.ai\/install\.(sh|ps1)/, 'native installer');
  assert.match(t, /pull_request/, 'runs on PRs');
  assert.match(t, /push:[\s\S]*branches:[\s\S]*main/, 'runs on push to main');
  assert.doesNotMatch(t, /secrets\.|ANTHROPIC_|npm (i|install)\b/, 'no secrets, no npm (PROJ-2, PROJ-4)');
});

test('R7 .gitignore ignores PROGRESS.md', () => {
  assert.ok(read('.gitignore').split(/\r?\n/).some((l) => /^\/?PROGRESS\.md$/.test(l.trim())));
});

test('R8 Stop hook runs strict validate on both the marketplace and the plugin, and blocks a skill with no frontmatter', () => {
  const s = read('.claude/hooks/stop.mjs');
  assert.match(s, /'validate', '--strict', '\.'/, 'validate --strict .');
  assert.match(s, /'validate', '--strict', 'plugins\/proofrig'/, 'validate --strict plugins/proofrig');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'proofrig-r8-'));
  for (const d of ['.claude-plugin', 'plugins', '.claude', 'e2e', 'harness', 'README.md']) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  const stop = (session_id) => spawnSync(process.execPath, [path.join(tmp, '.claude/hooks/stop.mjs')], {
    cwd: tmp, encoding: 'utf8', timeout: 300_000, input: JSON.stringify({ session_id, cwd: tmp }), env: env({ CLAUDE_PROJECT_DIR: tmp }),
  });
  const green = stop(`r8-green-${process.pid}`);
  assert.ok(green.status === 0 && !/"block"/.test(green.stdout), `green copy passes\n${green.stdout}`);
  fs.writeFileSync(path.join(tmp, 'plugins/proofrig/skills/ship/SKILL.md'), 'no frontmatter\n');
  const red = stop(`r8-red-${process.pid}`);
  assert.match(red.stdout, /"decision":"block"/, `missing frontmatter blocks\n${red.stdout}`);
});

test('R9 docs name the plugin validate command wherever the Stop hook or validate is described', () => {
  assert.match(section(read('CLAUDE.md'), /Commands/), VALIDATE_PLUGIN, 'CLAUDE.md Commands');
  assert.ok(lineWith(read('harness/rules/components/plugin.md'), /PLUGIN-4/, /validate .*\./, VALIDATE_PLUGIN), 'PLUGIN-4');
  assert.match(read('harness/components.md'), VALIDATE_PLUGIN, 'components.md');
  const g = read('harness/goal-template.md');
  assert.ok(lineWith(g, /^\d+\. Run:/, VALIDATE_PLUGIN), 'goal-template Run step');
  assert.ok(lineWith(g, /^- /, VALIDATE_PLUGIN, /pass/), 'goal-template Done criteria');
  assert.ok(lineWith(section(read('harness/CLAUDE.md'), /Enforcement/), /Stop/, /--strict/, VALIDATE_PLUGIN), 'harness/CLAUDE.md Stop bullet');
  assert.ok(lineWith(section(read('README.md'), /Develop/), /Stop hook/, VALIDATE_PLUGIN), 'README Developing: Stop hook sentence');
});

test('R10 failure log has entries for the guard false positive, the fail-open guard, and the stacked-PR merge, each ending in a harness change', () => {
  const entries = read('harness/failure-log.md').split(/^## /m).slice(1);
  assert.ok(entries.length >= 4, `entries: ${entries.length}`);
  for (const e of entries) {
    const bullets = e.split('\n').filter((l) => /^- /.test(l));
    assert.match(bullets.at(-1) ?? '', /^- Harness change made:/, `entry "${e.split('\n')[0]}" ends in a harness change`);
  }
  assert.ok(entries.some((e) => e.includes('2>&1')), 'guard false positive (2>&1)');
  assert.ok(entries.some((e) => /fail(s|ed)?[ -]open|exit(s|ed)? 1/i.test(e)), 'fail-open guard');
  assert.ok(entries.some((e) => /#6\b/.test(e) && /#9\b/.test(e)), 'stacked-PR merge (#6 re-landed as #9)');
});

test('R11 goal template: retarget slice PRs to main before merging, and PROGRESS.md in the allowed paths', () => {
  const g = read('harness/goal-template.md');
  assert.ok(lineWith(g, /retarget/i, /main/) || /Automatically delete head branches/.test(g), 'retarget rule');
  assert.ok(lineWith(g, /^Do not:/, /PROGRESS\.md/), 'Do not line lists PROGRESS.md');
});

test('R12 rubric: B1-B5 pass and the score is at least 8.5 with no base regressions', () => {
  const score = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'specs/docs-skill-reliability/checks/score.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 600_000, env: env() });
  const only = score('--only', 'B1,B2,B3,B4,B5');
  assert.strictEqual(only.status, 0, only.stdout);
  const all = score('--min', '8.5');
  assert.strictEqual(all.status, 0, all.stdout);
});
