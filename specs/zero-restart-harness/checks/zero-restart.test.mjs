// Checks for specs/zero-restart-harness. One test per requirement, named by ID. Text checks on
// the init skill and its references; the behavior is proven by the live e2e (R7, done-criterion).
// Usage: node specs/zero-restart-harness/checks/zero-restart.test.mjs
//        node --test-name-pattern="^R(1|2) " specs/zero-restart-harness/checks/zero-restart.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '');
const INIT = read('plugins/proofrig/skills/init/SKILL.md');
const TEMPLATES = read('plugins/proofrig/skills/init/references/templates.md');
const BASE_RULES = read('plugins/proofrig/skills/init/references/base-rules.md');
const section = (md, re) => {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^## /.test(l) && re.test(l));
  if (i < 0) return '';
  const j = lines.findIndex((l, k) => k > i && /^## /.test(l));
  return lines.slice(i, j < 0 ? undefined : j).join('\n');
};
const lineWith = (text, ...res) => text.split('\n').some((l) => res.every((re) => re.test(l)));

test('R1 init and its references have no PROOFRIG_UNLOCK or human-unlock step', () => {
  for (const [name, t] of [['init SKILL.md', INIT], ['templates.md', TEMPLATES], ['base-rules.md', BASE_RULES]]) {
    assert.ok(t, `${name} exists`);
    assert.ok(!t.includes('PROOFRIG_UNLOCK'), `${name} mentions PROOFRIG_UNLOCK`);
    assert.ok(!/Human unlock/i.test(t), `${name} has a "Human unlock" step`);
  }
});

test('R2 Phase 6: protected paths are scoped by agent (agent_type): main session may edit, subagents only their component', () => {
  const p6 = section(INIT, /Phase 6/);
  assert.ok(lineWith(p6, /agent_type/, /main session/i), 'names agent_type and the main session on one line');
  assert.ok(lineWith(p6, /main session/i, /(protected|harness\/)/), 'main session may edit protected paths');
  assert.ok(lineWith(p6, /subagent/i, /(shell|Bash)/i, /(block|never|not)/i), 'subagents may not write protected paths by shell');
});

test('R3 Phase 6: settings.json is still written last, without claiming it blocks the session from harness/', () => {
  const p6 = section(INIT, /Phase 6/);
  assert.ok(/Write `\.claude\/settings\.json` last/.test(p6), 'write-last rule kept (rubric b4)');
  assert.ok(!/block any further writes to `harness\/`/.test(p6), 'stale "will block any further writes" claim removed');
});

test('R4 update mode applies changes in the same session, with no restart', () => {
  const mode = section(INIT, /^## Mode/);
  assert.ok(mode, 'Mode section exists');
  assert.ok(!/restart/i.test(mode), 'no restart step');
  assert.ok(lineWith(mode, /update mode/i, /same session/i), 'says update mode applies changes in the same session');
});

test('R5 new or changed agents: init ends its turn after writing and runs Phase 7 on the next reply', () => {
  assert.ok(lineWith(INIT, /agent/i, /(next (message|turn|reply)|same turn)/i, /(load|spawn)/i), 'states agents load on the next message, not mid-turn');
  assert.ok(lineWith(INIT, /(reply|answer)/i, /go/, /(dry run|Phase 7)/i), 'asks for one reply before the dry run');
  assert.ok(!/restart/i.test(section(INIT, /Phase 7/)), 'Phase 7 needs no restart');
});

test('R6 tripwire: REV-9 in base rules and a matching stop condition in the generated goal template', () => {
  assert.ok(lineWith(BASE_RULES, /REV-9/, /git diff --stat/), 'REV-9 runs git diff --stat');
  assert.ok(lineWith(BASE_RULES, /REV-9/, /(protected|harness\/|hook)/i, /(spec|SPEC\.md)/), 'REV-9 flags protected/grading files the spec does not name');
  assert.ok(lineWith(TEMPLATES, /^Stop and report/, /git diff --stat/), 'goal template stop condition');
});

test('R7 e2e asserts the zero-restart behavior on a generated harness (PROJ-1)', () => {
  const e = read('e2e/run.mjs');
  assert.ok(!e.includes("'PROOFRIG_UNLOCK=1 lets a human edit harness/'"), 'old unlock assertion removed');
  for (const name of ['main session may edit harness/ with no unlock step', 'a non-owning subagent is blocked from harness/', 'generated harness has no PROOFRIG_UNLOCK step']) {
    assert.ok(e.includes(`check('${name}'`), name);
  }
  assert.match(e, /agent_type: 'general-purpose'/, 'subagent probe carries agent_type');
});

test('R8 README says init pauses for one reply before the dry run, with no restart', () => {
  assert.ok(lineWith(read('README.md'), /\/proofrig:init|init/, /dry run/i, /(reply|next message)/i), 'README mentions the reply before the dry run');
});
