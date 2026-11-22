// Tests for ciwait.mjs: the judgment of a commit's check runs. The hand-built lists are in the REST shape (name, status, conclusion); the recorded list is a
// real check-run list from this repository, reduced to the fields the judgment reads. No network.
// Run: node --test tools/ciwait.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reportRuns, judge } from './ciwait.mjs';
import { githubToken } from './github-token.mjs';

// The token helper (C194b-1): the process environment first, the Windows User environment on Windows, and a plain error naming the variable.
test('githubToken returns the process environment value without a shell', () => {
  const saved = process.env.GITHUB_READ_TOKEN;
  try {
    process.env.GITHUB_READ_TOKEN = 'stub-read-token';
    assert.equal(githubToken('GITHUB_READ_TOKEN'), 'stub-read-token');
  } finally {
    if (saved === undefined) delete process.env.GITHUB_READ_TOKEN; else process.env.GITHUB_READ_TOKEN = saved;
  }
});

test('githubToken refuses any name other than the two house token names', () => {
  assert.throws(() => githubToken('PATH'), /unknown token name: PATH/);
  assert.throws(() => githubToken('GITHUB_READ_TOKEN; calc'), /unknown token name/);
});

const RECORDED = JSON.parse(readFileSync(new URL('./fixture-fbc1164-checkruns.json', import.meta.url), 'utf8')).check_runs;
const run = (name, conclusion = 'success', status = 'completed') => ({ name, status, conclusion, id: name.length });
const GREEN = [run('all-green'), run('surface (published claims)'), run('secret scan'), run('optional check', 'skipped'), run('neutral check', 'neutral')];
const RED_RUN = [run('all-green', 'success'), run('surface (published claims)', 'failure'), run('secret scan')];
const RED_GATE = [run('all-green', 'failure'), run('surface (published claims)')];
const OPEN = [run('all-green', 'success', 'in_progress'), run('surface (published claims)')];
const NO_GATE = [run('surface (published claims)')];

// The rule the old script applied: every run completed is "ALL COMPLETED" with exit 0, whatever the conclusions were.
const originalExit = runs => (runs.length && runs.every(r => r.status === 'completed') ? 0 : 3);

test('the original rule passes a list with a failing run as green (the defect the head found)', () => {
  assert.equal(originalExit(RED_RUN), 0);
});

test('a recorded list of this repository, every run completed, is passed by the original rule and is RED under the judgment', () => {
  assert.equal(originalExit(RECORDED), 0);
  const r = reportRuns(RECORDED);
  assert.equal(r.code, 1);
  assert.ok(r.lines.includes('RED: all-green failure'), r.lines.join('\n'));
  assert.ok(r.lines.includes('RED: rendered (320 px reflow, 200% text, CSP, reading theme, Thai glyphs, skip link, header, keys) failure'), r.lines.join('\n'));
});

test('a failing run is RED, is named with its conclusion, and the verdict exits 1', () => {
  const r = reportRuns(RED_RUN);
  assert.equal(r.code, 1);
  assert.ok(r.lines.includes('RED: surface (published claims) failure'), r.lines.join('\n'));
});

test('a failing all-green is RED and is named', () => {
  const r = reportRuns(RED_GATE);
  assert.equal(r.code, 1);
  assert.ok(r.lines.includes('RED: all-green failure'), r.lines.join('\n'));
});

test('a commit with no all-green check is RED: all-green missing', () => {
  const r = reportRuns(NO_GATE);
  assert.equal(r.code, 1);
  assert.ok(r.lines.includes('RED: all-green missing'), r.lines.join('\n'));
});

test('success, skipped and neutral are not failures: the list is GREEN and exits 0', () => {
  const r = reportRuns(GREEN);
  assert.equal(r.code, 0);
  assert.ok(r.lines.includes('GREEN: all-green success, no failing check'), r.lines.join('\n'));
});

test('a run still open is reported as open with exit 3', () => {
  const r = reportRuns(OPEN);
  assert.equal(r.code, 3);
  assert.ok(r.lines.includes('STILL WAITING 1 open (call again)'), r.lines.join('\n'));
});

test('cancelled, timed_out, action_required and startup_failure are each a failure', () => {
  for (const c of ['cancelled', 'timed_out', 'action_required', 'startup_failure']) {
    assert.equal(judge([run('all-green'), run('x', c)]).state, 'red', c);
  }
});
