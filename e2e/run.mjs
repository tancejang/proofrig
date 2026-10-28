// Behavioral e2e for proofrig. Runs /proofrig:init for real against throwaway copies of
// the fixtures, then feeds sample tool calls to the generated hooks and asserts what they
// block. Usage: node e2e/run.mjs [with-e2e|no-e2e]. Exit 0 = pass.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = path.join(ROOT, 'plugins', 'proofrig');
// Claude Code runs hook commands with Git Bash on Windows; system32 bash.exe is WSL.
const BASH = process.env.PROOFRIG_BASH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const TIMEOUT_MS = 10 * 60 * 1000;
// acceptEdits still prompts for protected .claude/ writes and allow rules can't pre-approve
// them; this hook answers those prompts for paths inside the workspace only.
const APPROVER = path.join(ROOT, 'e2e', 'approve.mjs').replaceAll('\\', '/');
const APPROVER_SETTINGS = JSON.stringify({
  hooks: { PermissionRequest: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: `node "${APPROVER}"` }] }] },
});

const PROMPT = `/proofrig:init

This is an unattended test run and nobody will answer questions. Accept every recommended default as if the user replied "go" and continue without pausing. Interview answers: one repo at the current directory; PR tool gh; default branch main; protected branch main; use the current session model for every role; no extra project rules. Never choose to proceed with a weakened harness: if a phase says to stop, stop and give your report. Skip the Phase 7 model smoke test (do not spawn subagents).`;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ` -- ${detail}` : ''}`);
  if (!ok) failures++;
}

function git(cwd, ...args) {
  spawnSync('git', ['-c', 'user.name=e2e', '-c', 'user.email=e2e@example.com', ...args], { cwd, stdio: 'ignore' });
}

function makeFixture(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `proofrig-e2e-${name}-`));
  fs.cpSync(path.join(ROOT, 'e2e', 'fixtures', name), dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'fixture');
  return dir;
}

function runInit(dir) {
  const args = ['-p', '--plugin-dir', PLUGIN, '--add-dir', PLUGIN, '--setting-sources', 'project', '--strict-mcp-config',
    '--no-session-persistence', '--permission-mode', 'acceptEdits', '--permission-prompts', 'none'];
  if (process.env.PROOFRIG_E2E_MODEL) args.push('--model', process.env.PROOFRIG_E2E_MODEL);
  args.push('--settings', APPROVER_SETTINGS);
  const cmds = ['node *', 'npm *', 'git *', 'mkdir *', 'ls *', 'chmod *'];
  args.push('--allowedTools', ...cmds.flatMap((c) => [`Bash(${c})`, `PowerShell(${c})`]));
  const r = spawnSync('claude', args, { cwd: dir, input: PROMPT, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 64 << 20 });
  fs.writeFileSync(`${dir}.log`, `${r.stdout ?? ''}\n--- stderr ---\n${r.stderr ?? ''}`);
  console.log(`  workspace: ${dir}\n  log: ${dir}.log`);
  check('init run finished', !r.error && r.status === 0, r.error?.message ?? `exit ${r.status}`);
  return r.stdout ?? '';
}

function isBlocked(r) {
  if (r.status === 2) return true;
  try {
    const j = JSON.parse(r.stdout.trim());
    return j.decision === 'block' || j.continue === false || j.hookSpecificOutput?.permissionDecision === 'deny';
  } catch {
    return false;
  }
}

// Runs every hook registered for `event` whose matcher fits the tool, the way Claude Code would.
function runHooks(dir, settings, event, payload, extraEnv = {}) {
  for (const group of settings.hooks?.[event] ?? []) {
    const m = group.matcher;
    if (m && m !== '*' && !new RegExp(`^(?:${m})$`).test(payload.tool_name ?? '')) continue;
    for (const h of group.hooks ?? []) {
      if (h.type !== 'command') continue;
      const r = spawnSync(BASH, ['-c', h.command], {
        cwd: dir, encoding: 'utf8', timeout: 120_000,
        input: JSON.stringify({ session_id: 'e2e', transcript_path: '', cwd: dir, hook_event_name: event, ...payload }),
        env: { ...process.env, PROOFRIG_UNLOCK: '', CLAUDE_PROJECT_DIR: dir, ...extraEnv },
      });
      if (isBlocked(r)) return true;
    }
  }
  return false;
}

const edit = (dir, rel) => ({ tool_name: 'Edit', tool_input: { file_path: path.join(dir, rel), old_string: 'a', new_string: 'b' } });

function caseWithE2e() {
  console.log('\n== with-e2e: init generates a harness whose hooks enforce ==');
  const dir = makeFixture('with-e2e');
  runInit(dir);

  for (const f of ['CLAUDE.md', 'harness/harness.config.md', 'harness/components.md', 'harness/goal-template.md',
    'harness/e2e/README.md', 'harness/rules/base.md', 'harness/rules/reviewer.md', '.claude/settings.json', '.claude/agents/verifier.md']) {
    check(`generated ${f}`, fs.existsSync(path.join(dir, f)));
  }
  const e2eDoc = fs.existsSync(path.join(dir, 'harness/e2e/README.md')) ? fs.readFileSync(path.join(dir, 'harness/e2e/README.md'), 'utf8') : '';
  check('e2e README records the real e2e command', /npm run e2e|e2e\.js/.test(e2eDoc));

  const verifier = fs.existsSync(path.join(dir, '.claude/agents/verifier.md')) ? fs.readFileSync(path.join(dir, '.claude/agents/verifier.md'), 'utf8') : '';
  const tools = verifier.match(/^tools:\s*(.+)$/m)?.[1];
  check('verifier lists tools and has no edit tools', !!tools && !/\b(Edit|Write|NotebookEdit)\b/.test(tools), tools ?? 'no tools: line (inherits all)');

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
  } catch (e) {
    check('settings.json parses', false, e.message);
    return;
  }

  check('PreToolUse blocks edit to harness/', runHooks(dir, settings, 'PreToolUse', edit(dir, 'harness/harness.config.md')));
  check('PROOFRIG_UNLOCK=1 lets a human edit harness/', !runHooks(dir, settings, 'PreToolUse',
    edit(dir, 'harness/harness.config.md'), { PROOFRIG_UNLOCK: '1' }));
  check('PreToolUse allows edit to src/',!runHooks(dir, settings, 'PreToolUse', edit(dir, 'src/add.js')));

  fs.mkdirSync(path.join(dir, 'specs/demo/checks'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'specs/demo/SPEC.md'), '# demo\n');
  fs.writeFileSync(path.join(dir, 'specs/demo/checks/r1.test.js'), '// check\n');
  check('unlocked spec checks are editable', !runHooks(dir, settings, 'PreToolUse', edit(dir, 'specs/demo/checks/r1.test.js')));
  fs.writeFileSync(path.join(dir, 'specs/demo/.locked'), '');
  check('locked spec checks are frozen', runHooks(dir, settings, 'PreToolUse', edit(dir, 'specs/demo/checks/r1.test.js')));
  check('locked SPEC.md is frozen', runHooks(dir, settings, 'PreToolUse',
    { tool_name: 'Write', tool_input: { file_path: path.join(dir, 'specs/demo/SPEC.md'), content: 'x' } }));

  const forcePush = { tool_name: 'Bash', tool_input: { command: 'git push --force origin main' } };
  const denied = (settings.permissions?.deny ?? []).some((r) => /^Bash\(.*push.*(--force|-f)/.test(r));
  check('force-push is blocked (hook or deny rule)', denied || runHooks(dir, settings, 'PreToolUse', forcePush));

  const add = path.join(dir, 'src/add.js');
  const good = fs.readFileSync(add, 'utf8');
  fs.writeFileSync(add, 'module.exports = (a, b) => a - b;\n');
  check('Stop hook blocks on red tests', runHooks(dir, settings, 'Stop', { stop_hook_active: false }));
  fs.writeFileSync(add, good);
  check('Stop hook passes on green', !runHooks(dir, settings, 'Stop', { stop_hook_active: false }));
}

function caseNoE2e() {
  console.log('\n== no-e2e: init stops at the gap report ==');
  const dir = makeFixture('no-e2e');
  const out = runInit(dir);
  check('no harness/ generated', !fs.existsSync(path.join(dir, 'harness')));
  check('no .claude/settings.json generated', !fs.existsSync(path.join(dir, '.claude/settings.json')));
  check('report names the missing e2e check', /e2e|end-to-end/i.test(out));
}

const only = process.argv[2];
if (!only || only === 'with-e2e') caseWithE2e();
if (!only || only === 'no-e2e') caseNoE2e();
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
