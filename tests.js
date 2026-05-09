#!/usr/bin/env node
'use strict';

var Handoff = require('./handoff.js');

// Each case: [label, query, expected]. Expected fields are partial — only the
// listed fields are asserted on the actual result.
var cases = [
  // Happy path / landing
  ['AC-1: obsidian happy path',
    '?to=obsidian%3A%2F%2Fopen%3Fvault%3DiCloud%26file%3DNote',
    { kind: 'navigate', url: 'obsidian://open?vault=iCloud&file=Note', scheme: 'obsidian' }],
  ['AC-2a: bare URL (no query)',
    '',
    { kind: 'landing' }],
  ['AC-2b: query without to',
    '?other=1',
    { kind: 'landing' }],

  // Empty / malformed to
  ['AC-3: empty to (?to=)',
    '?to=',
    { kind: 'reject', reason: 'empty-to' }],
  ['AC-4: to has no scheme',
    '?to=foo',
    { kind: 'reject', reason: 'no-scheme-or-bad-scheme' }],
  ['AC-5: double-encoded scheme separator',
    '?to=obsidian%253A%252F%252Fopen',
    { kind: 'reject', reason: 'no-scheme-or-bad-scheme' }],
  ['AC-6: malformed inner percent encoding',
    '?to=obsidian%3A%2F%2Fopen%3Fx%3D%ZZ',
    { kind: 'reject', reason: 'malformed-encoding' }],
  ['AC-7: javascript hidden behind double encoding',
    '?to=javascript%253Aalert(1)',
    { kind: 'reject', reason: 'no-scheme-or-bad-scheme' }],

  // Decoding semantics for '+'
  ['AC-8: + preserved verbatim',
    '?to=anki%3A%2F%2Fx-callback-url%2Fstudy%3Fdeck%3DDeutsch+B1',
    { kind: 'navigate', url: 'anki://x-callback-url/study?deck=Deutsch+B1' }],
  ['AC-9: %2520 single-decodes to %20 (one step only)',
    '?to=anki%3A%2F%2Fx-callback-url%2Fstudy%3Fdeck%3DDeutsch%2520B1',
    { kind: 'navigate', url: 'anki://x-callback-url/study?deck=Deutsch%20B1' }],
  ['AC-9b: %20 single-decodes to literal space',
    '?to=anki%3A%2F%2Fx-callback-url%2Fstudy%3Fdeck%3DDeutsch%20B1',
    { kind: 'navigate', url: 'anki://x-callback-url/study?deck=Deutsch B1' }],

  // Denylist (case-insensitive)
  ['AC-10: http rejected', '?to=http%3A%2F%2Fexample.com',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-11: https rejected', '?to=https%3A%2F%2Fexample.com',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-12: javascript rejected', '?to=javascript%3Aalert(1)',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-13: data rejected', '?to=data%3Atext%2Fhtml%2Cfoo',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-14: blob rejected', '?to=blob%3Ahttps%3A%2F%2Fx',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-15: file rejected', '?to=file%3A%2F%2F%2Fetc%2Fpasswd',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-16: ftp rejected', '?to=ftp%3A%2F%2Fx.com',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-17: ftps rejected', '?to=ftps%3A%2F%2Fx.com',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-18: view-source rejected', '?to=view-source%3Ahttps%3A%2F%2Fx',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-19: vbscript rejected', '?to=vbscript%3Amsgbox',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-20: about rejected', '?to=about%3Ablank',
    { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-21a: JavaScript: rejected (mixed case)',
    '?to=JavaScript%3Aalert(1)', { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-21b: HTTPS rejected (uppercase)',
    '?to=HTTPS%3A%2F%2Fx', { kind: 'reject', reason: 'denied-scheme' }],
  ['AC-21c: View-Source rejected (mixed case)',
    '?to=View-Source%3Ahttps%3A%2F%2Fx', { kind: 'reject', reason: 'denied-scheme' }],

  // Structural validation
  ['AC-22: scheme contains illegal char',
    '?to=foo%21bar%3A%2F%2Fx', { kind: 'reject', reason: 'no-scheme-or-bad-scheme' }],
  ['AC-23: scheme starts with digit',
    '?to=1http%3A%2F%2Fx', { kind: 'reject', reason: 'no-scheme-or-bad-scheme' }],
  ['AC-24: schemeless //evil.com',
    '?to=%2F%2Fevil.com%2Fpath', { kind: 'reject', reason: 'no-scheme-or-bad-scheme' }],

  // Allowed app schemes
  ['AC-25: obsidian accepted',
    '?to=obsidian%3A%2F%2Fopen%3Fvault%3DiCloud%26file%3DNote',
    { kind: 'navigate', scheme: 'obsidian' }],
  ['AC-26: anki accepted',
    '?to=anki%3A%2F%2Fx-callback-url%2Fstudy%3Fdeck%3DDeutsch%2520B1',
    { kind: 'navigate', scheme: 'anki' }],
  ['AC-27a: novel scheme things accepted',
    '?to=things%3A%2F%2F%2Fadd%3Ftitle%3DTest', { kind: 'navigate', scheme: 'things' }],
  ['AC-27b: novel scheme bear accepted',
    '?to=bear%3A%2F%2Fx-callback-url%2Fopen-note%3Ftitle%3DTest',
    { kind: 'navigate', scheme: 'bear' }],
  ['AC-27c: novel scheme spotify accepted',
    '?to=spotify%3Atrack%3A123', { kind: 'navigate', scheme: 'spotify' }],
  ['AC-27d: scheme with allowed punctuation',
    '?to=x-callback%3A%2F%2Ffoo', { kind: 'navigate', scheme: 'x-callback' }],

  // Duplicate to
  ['AC-D1: ?to=a&to=b',
    '?to=a&to=b', { kind: 'reject', reason: 'duplicate-to' }],
  ['AC-D2: ?to=valid&to=',
    '?to=obsidian%3A%2F%2Fopen&to=',
    { kind: 'reject', reason: 'duplicate-to' }],
  ['AC-D3: duplicate non-to ignored',
    '?to=obsidian%3A%2F%2Fopen&foo=1&foo=2',
    { kind: 'navigate', scheme: 'obsidian' }],
];

function check(actual, expected) {
  for (var k in expected) {
    if (actual[k] !== expected[k]) {
      return { ok: false, key: k, want: expected[k], got: actual[k] };
    }
  }
  return { ok: true };
}

var pass = 0, fail = 0;
var failures = [];
cases.forEach(function (c) {
  var label = c[0], query = c[1], expected = c[2];
  var actual = Handoff.classify(query);
  var r = check(actual, expected);
  if (r.ok) {
    pass++;
    console.log('  PASS  ' + label);
  } else {
    fail++;
    failures.push({ label: label, query: query, expected: expected, actual: actual, mismatch: r });
    console.log('  FAIL  ' + label);
    console.log('         query    = ' + JSON.stringify(query));
    console.log('         expected ' + r.key + ' = ' + JSON.stringify(r.want));
    console.log('         got      ' + r.key + ' = ' + JSON.stringify(r.got));
    console.log('         actual   = ' + JSON.stringify(actual));
  }
});

console.log('\n' + pass + ' passed, ' + fail + ' failed (' + cases.length + ' total)');
process.exit(fail === 0 ? 0 : 1);
