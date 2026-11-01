// Stop hook: the turn cannot end on red. Runs the cheap checks (manifest validation, script
// syntax). After the same failure 3 times it lets the run stop, marked STUCK, so it gets
// reported instead of looping. The live e2e is too slow for every Stop; it is a /goal
// done-criterion instead (harness/goal-template.md).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const req = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const root = process.env.CLAUDE_PROJECT_DIR || req.cwd || process.cwd();

const scripts = ['e2e', '.claude/hooks', 'harness/golden-tasks'].flatMap((d) => {
  const dir = path.join(root, d);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).map((f) => path.join(dir, f)) : [];
});
const checks = [
  ['claude plugin validate --strict .', 'claude', ['plugin', 'validate', '--strict', '.']],
  ['claude plugin validate --strict plugins/proofrig', 'claude', ['plugin', 'validate', '--strict', 'plugins/proofrig']],
  ...scripts.map((s) => [`node --check ${path.relative(root, s)}`, process.execPath, ['--check', s]]),
];

const failures = [];
for (const [name, cmd, args] of checks) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 120_000 });
  if (r.status !== 0) failures.push(`${name} failed:\n${(r.stdout ?? '') + (r.stderr ?? '') || r.error?.message}`);
}

const counter = path.join(os.tmpdir(), `proofrig-stop-${req.session_id ?? 'none'}.json`);
if (!failures.length) {
  fs.rmSync(counter, { force: true });
  process.exit(0);
}

const report = failures.join('\n\n');
let state = { report: '', count: 0 };
try {
  state = JSON.parse(fs.readFileSync(counter, 'utf8'));
} catch {}
state = { report, count: state.report === report ? state.count + 1 : 1 };
fs.writeFileSync(counter, JSON.stringify(state));

if (state.count >= 3) {
  console.log(JSON.stringify({ systemMessage: `proofrig: STUCK, same check failure 3 times. Stop and report it.\n${report}` }));
} else {
  console.log(JSON.stringify({ decision: 'block', reason: `Checks are red; fix them before stopping (BASE-1).\n${report}` }));
}
