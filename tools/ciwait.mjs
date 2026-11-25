// node ciwait.mjs <fullsha> [maxSeconds]: polls the check runs of a commit every 30 s until all are completed or time runs out; prints each run's name, status,
// conclusion and id, then a verdict. It JUDGES: exit 0 only when the check named all-green concluded success and no completed check concluded a failure;
// exit 1 on RED (each failing check named); exit 3 while runs are still open at the time limit. A successful, skipped or neutral run is not a failure.
// Token (GITHUB_TOKEN): check runs are readable only with it, GET only (main's rule, 2026-11-25). The judgment is pure (judge, reportRuns) so a test can feed it a recorded list; the CLI sits behind the entry guard.
import { githubToken } from './github-token.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FAILING = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure']);

// The check runs (REST shape: name, status, conclusion) to one state: 'open' while any run is not completed (or there are none yet),
// 'red' with the reasons, or 'green'.
export function judge(runs) {
  const open = runs.filter(r => r.status !== 'completed');
  if (!runs.length || open.length) return { state: 'open', open: open.length };
  const reasons = runs.filter(r => FAILING.has(r.conclusion)).map(r => `${r.name} ${r.conclusion}`);
  const gate = runs.find(r => r.name === 'all-green');
  if (!gate) reasons.push('all-green missing');
  else if (gate.conclusion !== 'success' && !FAILING.has(gate.conclusion)) reasons.push(`all-green ${gate.conclusion}`);
  return reasons.length ? { state: 'red', reasons } : { state: 'green' };
}

// The verdict lines and the exit code for a list of runs (used by the CLI at the end of its wait, and by the tests).
export function reportRuns(runs) {
  const v = judge(runs);
  if (v.state === 'open') {
    return { code: 3, lines: [runs.length ? `STILL WAITING ${v.open} open (call again)` : 'NO CHECK RUNS yet (call again)'] };
  }
  if (v.state === 'green') return { code: 0, lines: ['GREEN: all-green success, no failing check'] };
  return { code: 1, lines: v.reasons.map(reason => `RED: ${reason}`) };
}

async function main() {
  const tok = githubToken('GITHUB_TOKEN');
  const H = { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' };
  const [sha, maxS = '500'] = process.argv.slice(2);
  const end = Date.now() + Number(maxS) * 1000;
  for (;;) {
    const j = await (await fetch(`https://api.github.com/repos/Kolwen-AI/Kolwen/commits/${sha}/check-runs?per_page=100`, { headers: H })).json();
    const runs = j.check_runs || [];
    const v = judge(runs);
    if (v.state !== 'open' || Date.now() > end) {
      for (const r of runs) console.log(`${r.name} | ${r.status} | ${r.conclusion} | ${r.id}`);
      const out = reportRuns(runs);
      for (const line of out.lines) console.log(line);
      process.exitCode = out.code;
      return;
    }
    await new Promise(r => setTimeout(r, 30000));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
