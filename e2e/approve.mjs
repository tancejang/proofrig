// PermissionRequest hook for e2e runs: nobody answers prompts there, so approve file writes
// that resolve inside the run's workspace (incl. protected .claude/). Anything else gets no
// answer and is denied by --permission-prompts none.
import fs from 'node:fs';
import path from 'node:path';

const req = JSON.parse(fs.readFileSync(0, 'utf8'));
const file = req.tool_input?.file_path ?? req.tool_input?.notebook_path;
if (file && req.cwd) {
  const rel = path.relative(req.cwd, path.resolve(req.cwd, file));
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } }));
  }
}
