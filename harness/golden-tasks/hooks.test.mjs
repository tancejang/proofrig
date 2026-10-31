// Golden tasks for the harness hooks: feeds sample tool calls to .claude/hooks/*.mjs and
// asserts block/allow. Runs against a throwaway copy of the repo. Exit 0 = pass.
// Usage: node harness/golden-tasks/hooks.test.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proofrig-hooks-'));
fs.cpSync(REPO, root, { recursive: true, filter: (src) => path.basename(src) !== '.git' });

function hook(name, payload, env = {}) {
  const r = spawnSync(process.execPath, [path.join(root, '.claude/hooks', name)], {
    cwd: root, encoding: 'utf8', timeout: 180_000,
    input: JSON.stringify({ session_id: `golden-${process.pid}-${Math.random()}`, cwd: root, ...payload }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, ...env },
  });
  let out = {};
  try {
    out = JSON.parse(r.stdout.trim() || '{}');
  } catch {}
  return { blocked: r.status === 2 || out.decision === 'block', out, stderr: r.stderr };
}
const edit = (file, extra = {}) => hook('guard.mjs', { tool_name: 'Edit', tool_input: { file_path: path.join(root, file) }, ...extra });
const sh = (command, extra = {}) => hook('guard.mjs', { tool_name: 'Bash', tool_input: { command }, ...extra });

test('protected paths', () => {
  for (const f of ['harness/rules/base.md', '.claude/settings.json', 'e2e/run.mjs']) {
    assert.ok(!edit(f).blocked, `main session: ${f}`);
    assert.ok(edit(f, { agent_type: 'general-purpose' }).blocked, `other subagent: ${f}`);
  }
  assert.ok(edit('.git/config').blocked, '.git');
  assert.ok(edit('../outside.txt').blocked, 'outside project');
  assert.ok(!edit('plugins/proofrig/skills/init/SKILL.md').blocked, 'component path');
});

test('component scoping and read-only agents', () => {
  assert.ok(edit('CLAUDE.md', { agent_type: 'implementer-plugin' }).blocked, 'out-of-component');
  assert.ok(!edit('README.md', { agent_type: 'implementer-plugin' }).blocked, 'in-component');
  assert.ok(edit('.claude/hooks/guard.mjs', { agent_type: 'implementer-plugin' }).blocked, 'plugin implementer, harness path');
  const as = (agent_type, f) => edit(f, { agent_type }).blocked;
  for (const f of ['.claude/hooks/guard.mjs', 'harness/failure-log.md', '.github/workflows/ci.yml', '.gitignore', 'CLAUDE.md', 'PROGRESS.md']) {
    assert.ok(!as('implementer-harness', f), `harness implementer: ${f}`);
  }
  for (const f of ['.claude/settings.json', '.claude/agents/verifier.md', 'e2e/run.mjs', 'README.md', 'plugins/proofrig/skills/init/SKILL.md']) {
    assert.ok(as('implementer-harness', f), `harness implementer blocked: ${f}`);
  }
  for (const f of ['README.md', '.claude/hooks/guard.mjs']) assert.ok(!as('simplifier', f), `simplifier: ${f}`);
  assert.ok(as('simplifier', '.claude/settings.json'), 'simplifier blocked: settings.json');
  assert.ok(!sh('echo x > harness/a.md').blocked, 'main session shell write');
  for (const a of ['implementer-harness', 'implementer-plugin', 'general-purpose']) {
    assert.ok(sh('echo x > harness/a.md', { agent_type: a }).blocked, `${a} shell write`);
  }
  assert.ok(edit('README.md', { agent_type: 'verifier' }).blocked, 'verifier edit');
  assert.ok(sh('git commit -m x', { agent_type: 'verifier' }).blocked, 'verifier commit');
  assert.ok(sh('echo x > notes.txt', { agent_type: 'verifier' }).blocked, 'verifier redirect');
  assert.ok(!sh('claude plugin validate . 2>&1', { agent_type: 'verifier' }).blocked, 'verifier runs checks');
});

test('subagent shell writes: reads with 2>&1 or quoted > allowed, nearest write forms blocked (HARN-1/2)', () => {
  const sub = (c) => sh(c, { agent_type: 'general-purpose' }).blocked;
  for (const c of ['ls 2>&1; cat harness/CLAUDE.md', 'ls 2>/dev/null; cat harness/CLAUDE.md', 'node --check e2e/run.mjs 2>&1',
    'gh pr create --title x --body "Spec -> Plan; see harness/CLAUDE.md"', 'sed -n 1,5p harness/CLAUDE.md',
    'echo x > specs/demo-harness/notes.md']) assert.ok(!sub(c), `allowed: ${c}`);
  for (const c of ['echo x > harness/a.md', 'cat a 2>&1 > e2e/x', 'echo x >> .claude/notes', 'echo x > "harness/a.md"',
    'echo hi>harness/a.md', 'echo x &> harness/z', 'echo "->" > harness/a.md', 'cat a | tee -a .claude/x', 'cp -r a ./harness/',
    'printf x >| e2e/y', 'sed -i s/a/b/ .claude/hooks/guard.mjs', 'Set-Content harness\\a.md x', 'echo x > HARNESS/a.md',
    'cp a "$(pwd)"/harness/x']) {
    assert.ok(sub(c), `blocked: ${c}`);
  }
});

test('guard fails closed on empty or invalid stdin', () => {
  for (const input of ['', '  \n', '{not json', 'null']) {
    const r = spawnSync(process.execPath, [path.join(root, '.claude/hooks/guard.mjs')], { encoding: 'utf8', input, env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    assert.ok(r.status === 2 && /proofrig guard:/.test(r.stderr), JSON.stringify(input));
  }
});

test('locked specs', () => {
  fs.mkdirSync(path.join(root, 'specs/demo/checks'), { recursive: true });
  assert.ok(!edit('specs/demo/checks/r1.test.mjs').blocked, 'unlocked');
  fs.writeFileSync(path.join(root, 'specs/demo/.locked'), '');
  assert.ok(edit('specs/demo/checks/r1.test.mjs').blocked, 'locked check');
  assert.ok(edit('specs/demo/SPEC.md').blocked, 'locked spec');
  assert.ok(sh('rm specs/demo/.locked').blocked, 'remove lock');
});

test('forbidden commands', () => {
  for (const c of ['git push --force origin x', 'git push -f origin x', 'git push origin main', 'gh pr merge 1',
    'git reset --hard HEAD~1', 'rm -rf plugins', 'git commit --no-verify -m x', 'cat .env']) {
    assert.ok(sh(c).blocked, c);
  }
  for (const c of ['git push -u origin feature-main', 'node e2e/run.mjs > out.txt', 'git status']) assert.ok(!sh(c).blocked, c);
});

test('stop hook: red blocks, green passes, stuck after 3', () => {
  const manifest = path.join(root, 'plugins/proofrig/.claude-plugin/plugin.json');
  const good = fs.readFileSync(manifest, 'utf8');
  assert.ok(!hook('stop.mjs', {}).blocked, 'green');
  fs.writeFileSync(manifest, '{ not json');
  const session_id = `stuck-${process.pid}`;
  assert.ok(hook('stop.mjs', { session_id }).blocked, 'red 1');
  assert.ok(hook('stop.mjs', { session_id }).blocked, 'red 2');
  const third = hook('stop.mjs', { session_id });
  assert.ok(!third.blocked && /STUCK/.test(third.out.systemMessage ?? ''), 'stuck on 3rd');
  fs.writeFileSync(manifest, good);
});
