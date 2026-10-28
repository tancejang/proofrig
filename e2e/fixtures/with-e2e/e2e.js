// End-to-end: run the real CLI and check its output. Exit 0 = pass.
const { execFileSync } = require('node:child_process');

const out = execFileSync(process.execPath, ['src/cli.js', '2', '3'], { encoding: 'utf8' }).trim();
if (out !== '5') {
  console.error(`e2e FAIL: expected 5, got ${out}`);
  process.exit(1);
}
console.log('e2e PASS');
