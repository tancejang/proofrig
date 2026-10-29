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
fs.cpSync(REPO, root, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git`) || src.endsWith('.gitignore') });

function hook(name, payload, env = {}) {
  const r = spawnSync(process.execPath, [path.join(root, '.claude/hooks', name)], {
    cwd: root, encoding: 'utf8', timeout: 180_000,
    input: JSON.stringify({ session_id: `golden-${process.pid}-${Math.random()}`, cwd: root, ...payload }),
    env: { ...process.env, PROOFRIG_UNLOCK: '', CLAUDE_PROJECT_DIR: root, ...env },
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
  for (const f of ['harness/rules/base.md', '.claude/settings.json', 'e2e/run.mjs']) assert.ok(edit(f).blocked, f);
  assert.ok(!hook('guard.mjs', { tool_name: 'Edit', tool_input: { file_path: path.join(root, 'harness/rules/base.md') } }, { PROOFRIG_UNLOCK: '1' }).blocked, 'unlock');
  assert.ok(edit('.git/config').blocked, '.git');
  assert.ok(edit('../outside.txt').blocked, 'outside project');
  assert.ok(!edit('plugins/proofrig/skills/init/SKILL.md').blocked, 'component path');
});

test('component scoping and read-only agents', () => {
  assert.ok(edit('CLAUDE.md', { agent_type: 'implementer-plugin' }).blocked, 'out-of-component');
  assert.ok(!edit('README.md', { agent_type: 'implementer-plugin' }).blocked, 'in-component');
  assert.ok(edit('.claude/hooks/guard.mjs', { agent_type: 'implementer-plugin' }).blocked, 'plugin implementer, harness path');
  const unlocked = (file, agent_type) => hook('guard.mjs', { tool_name: 'Edit', agent_type, tool_input: { file_path: path.join(root, file) } }, { PROOFRIG_UNLOCK: '1' }).blocked;
  for (const f of ['.claude/hooks/guard.mjs', 'harness/failure-log.md', '.github/workflows/ci.yml', '.gitignore', 'CLAUDE.md', 'PROGRESS.md']) {
    assert.ok(!unlocked(f, 'implementer-harness'), `harness implementer: ${f}`);
  }
  for (const f of ['.claude/settings.json', '.claude/agents/verifier.md', 'e2e/run.mjs', 'README.md', 'plugins/proofrig/skills/init/SKILL.md']) {
    assert.ok(unlocked(f, 'implementer-harness'), `harness implementer blocked: ${f}`);
  }
  for (const f of ['README.md', '.claude/hooks/guard.mjs']) assert.ok(!unlocked(f, 'simplifier'), `simplifier: ${f}`);
  assert.ok(unlocked('.claude/settings.json', 'simplifier'), 'simplifier blocked: settings.json');
  assert.ok(edit('README.md', { agent_type: 'verifier' }).blocked, 'verifier edit');
  assert.ok(sh('git commit -m x', { agent_type: 'verifier' }).blocked, 'verifier commit');
  assert.ok(sh('echo x > notes.txt', { agent_type: 'verifier' }).blocked, 'verifier redirect');
  assert.ok(!sh('claude plugin validate . 2>&1', { agent_type: 'verifier' }).blocked, 'verifier runs checks');
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
    'git reset --hard HEAD~1', 'rm -rf plugins', 'git commit --no-verify -m x', 'cat .env', 'echo x > harness/a.md']) {
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
