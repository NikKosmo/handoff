(function (global) {
  'use strict';

  var DENY = {
    'http': 1, 'https': 1, 'javascript': 1, 'data': 1, 'blob': 1,
    'file': 1, 'ftp': 1, 'ftps': 1, 'view-source': 1, 'vbscript': 1, 'about': 1
  };

  // RFC 3986 scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
  var SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.\-]*):/;

  // Manual query parser: URLSearchParams converts '+' to space, which the spec forbids.
  // decodeURIComponent only decodes '%XX' and leaves '+' verbatim.
  function getToValues(search) {
    if (!search || search.charAt(0) !== '?') return [];
    var q = search.slice(1);
    if (!q) return [];
    var pairs = q.split('&');
    var values = [];
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (!p) continue;
      var eq = p.indexOf('=');
      var rawKey = eq < 0 ? p : p.slice(0, eq);
      var rawVal = eq < 0 ? '' : p.slice(eq + 1);
      var key;
      try { key = decodeURIComponent(rawKey); } catch (e) { continue; }
      if (key !== 'to') continue;
      values.push(rawVal);
    }
    return values;
  }

  function classify(search) {
    var values = getToValues(search);
    if (values.length === 0) return { kind: 'landing' };
    if (values.length > 1) return { kind: 'reject', reason: 'duplicate-to' };

    var raw = values[0];
    if (raw === '') return { kind: 'reject', reason: 'empty-to' };

    var candidate;
    try { candidate = decodeURIComponent(raw); }
    catch (e) { return { kind: 'reject', reason: 'malformed-encoding' }; }

    var m = SCHEME_RE.exec(candidate);
    if (!m) return { kind: 'reject', reason: 'no-scheme-or-bad-scheme' };

    var scheme = m[1].toLowerCase();
    if (DENY[scheme]) return { kind: 'reject', reason: 'denied-scheme' };

    return { kind: 'navigate', url: candidate, scheme: scheme };
  }

  var api = { classify: classify, getToValues: getToValues, DENY: DENY };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.Handoff = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
