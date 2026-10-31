// PreToolUse guard for the proofrig harness. Exit 2 blocks the call; stderr is shown to the
// model. What it enforces and how to adjust it: harness/CLAUDE.md.
import fs from 'node:fs';
import path from 'node:path';

// Fail closed: Claude Code treats a crash (exit 1) as non-blocking.
let req;
try {
  req = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch {}
if (!req || typeof req !== 'object' || Array.isArray(req)) block('hook input is empty or not a JSON object; failing closed');
const root = process.env.CLAUDE_PROJECT_DIR || req.cwd;
const agent = req.agent_type ?? '';
const input = req.tool_input ?? {};

// Only the main session and the owning component's implementer may write here.
const PROTECTED = /^(harness|\.claude|e2e)(\/|$)/;
// Component paths per writing agent (harness/components.md). PROGRESS.md is the run's notes file.
const PLUGIN = /^(plugins\/|\.claude-plugin\/|README\.md$|PROGRESS\.md$)/;
const HARNESS = /^(\.claude\/hooks\/|harness\/|\.github\/|\.gitignore$|CLAUDE\.md$|PROGRESS\.md$)/;
const SCOPES = {
  'implementer-plugin': [PLUGIN],
  'implementer-harness': [HARNESS],
  simplifier: [PLUGIN, HARNESS],
};
const READ_ONLY = new Set(['verifier', 'planner']);

function block(msg) {
  console.error(`proofrig guard: ${msg}`);
  process.exit(2);
}

function checkPath(file) {
  const p = path.relative(root, path.resolve(req.cwd ?? root, file)).replaceAll('\\', '/');
  if (p.startsWith('..') || path.isAbsolute(p)) block(`${file} is outside the project`);
  if (/^\.git(\/|$)/.test(p)) block('.git/ is never edited directly');
  const spec = p.match(/^specs\/([^/]+)\/(SPEC\.md$|checks\/|\.locked$)/);
  if (spec && fs.existsSync(path.join(root, 'specs', spec[1], '.locked'))) {
    block(`specs/${spec[1]} is locked for this run; stop and report if the spec or a check is wrong`);
  }
  if (READ_ONLY.has(agent)) block(`${agent} is read-only`);
  const scope = SCOPES[agent];
  if (scope && !scope.some((re) => re.test(p))) block(`${agent} may edit only its component's paths (harness/components.md)`);
  if (agent && !scope && PROTECTED.test(p)) block(`${p} is protected (harness/, .claude/, e2e/); only the main session or the owning implementer may edit it`);
}

// ponytail: pattern-based shell checks, a creative command can slip past; the verifier's
// diff review (REV-6, REV-9) is the backstop. Upgrade path: sandbox or deny Bash writes entirely.
function checkShell(cmd) {
  const always = [
    [/git\s+push\b.*(--force\b|--force-with-lease|\s-f\b|\s\+\S)/, 'force-push'],
    [/git\s+push\b.*(\s|:)main(\s|$)/, 'push to main'],
    [/gh\s+pr\s+merge\b/, 'merging PRs'],
    [/git\s+reset\s+--hard\b/, 'git reset --hard'],
    [/--no-verify\b/, '--no-verify'],
    [/\brm\s+-[a-z]*(rf|fr)|Remove-Item\b.*-Recurse/i, 'recursive delete'],
    [/(^|[\s'"/])\.env(\.|\s|$|['"])/, '.env access'],
    [/\b(rm|del|mv|Remove-Item|Move-Item)\b.*\.locked\b/, 'removing a spec lock'],
  ];
  for (const [re, what] of always) if (re.test(cmd)) block(`${what} is not allowed`);
  // Old rule (any write operator anywhere before a protected path), minus exactly what R1 frees:
  // fd dups only when the digits end the word (2>&1, not >&1/../harness), null sinks (2>/dev/null),
  // arrows inside simple quotes only (no preceding backslash; no newline, $, backtick, or backslash
  // inside, so substitutions and escaped/odd quoting keep the arrow), and names glued to '-'
  // (specs/x-harness/). Only '-' frees .claude; harness/e2e are also freed after a word char.
  const masked = cmd
    .replace(/\d*>&\d+(?=[\s;&|)]|$)|\d*>\s*\/dev\/null\b/g, ' ')
    .replace(/(?<!\\)'[^'\\`$\n]*'|(?<!\\)"[^"\\`$\n]*"/g, (q) => q.replace(/->|→/g, '  '));
  const writes = String.raw`(>|\btee\b|\bsed\b(?=[\s\S]*\s-(?:[a-z]*i|-in-place))|\bcp\b|\bmv\b|Set-Content|Out-File|Add-Content|Copy-Item|Move-Item)`;
  const prot = String.raw`(?:(?<![\w-])(?:harness|e2e)|(?<!-)\.claude)([\/\\\s'";&|)]|$)`;
  if (agent && new RegExp(`${writes}[\\s\\S]*${prot}`, 'i').test(masked)) {
    block('subagents may not write to harness/, .claude/, or e2e/ by shell; use Edit or Write');
  }
  if (READ_ONLY.has(agent)) {
    const mutating = /(^|[;&|]\s*)git\s+(commit|push|checkout|switch|reset|rebase|merge|stash|add|rm|restore)\b|(?<![0-9&])>(?!&)|\btee\b|\bsed\s+-i|\b(rm|mv|cp)\s|Set-Content|Out-File|New-Item|Remove-Item/;
    if (mutating.test(cmd)) block(`${agent} is read-only; Bash is for running checks and reading git state`);
  }
}

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(req.tool_name)) {
  checkPath(input.file_path ?? input.notebook_path ?? '');
} else if (['Bash', 'PowerShell'].includes(req.tool_name)) {
  checkShell(input.command ?? '');
}
