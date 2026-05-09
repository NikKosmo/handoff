# handoff

Tiny static page that bounces app-scheme URLs (`obsidian://`, `anki://`, `mailto:`, `tel:`, …) through link previewers that strip them. Denylist-driven, validation byte = navigation byte.

## Why

Some messengers (notably Telegram) silently strip non-`http` schemes from links, so taps on `obsidian://open?vault=…` do nothing. This page sits at a normal `https://` URL, takes the target as a percent-encoded query parameter, and navigates the browser to the decoded target — handing it off to the OS, which routes to the registered app.

## Usage

```
https://nikkosmo.github.io/handoff/?to=<URL-ENCODED TARGET>
```

Examples:

```
?to=obsidian%3A%2F%2Fopen%3Fvault%3DiCloud%26file%3DNote
?to=anki%3A%2F%2Fx-callback-url%2Fstudy%3Fdeck%3DDeutsch%2520B1
?to=mailto%3Asomeone%40example.com
```

The page does **one** percent-decoding step on the value of `to`. If you need percent-escapes to survive into the target app, double-encode them at the source (the outer transport encoding consumes one layer).

## Denylist

Schemes that browsers can render, execute, or fall back to web navigation for are rejected (case-insensitive):

`http`, `https`, `javascript`, `data`, `blob`, `file`, `ftp`, `ftps`, `view-source`, `vbscript`, `about`

Anything else that passes RFC 3986 scheme grammar (`ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )`) is allowed. No allowlist — new app schemes work without page changes.

## Behaviour

- `?to=<allowed>` → browser navigates to the decoded target.
- No `to` param → landing page with a one-line explanation.
- Empty / malformed / denied / structurally invalid `to` → static rejection message.
- Duplicate `to` (`?to=a&to=b`) → rejected.
- Other query parameters → ignored.

## Files

- `index.html` — the page. References the two scripts below; no inline JS.
- `handoff.js` — pure validation logic. Dual export: browser global `Handoff` + CommonJS `module.exports`.
- `bootstrap.js` — browser-only DOM bootstrap. Calls `Handoff.classify` and either navigates or renders static text via `textContent`.
- `tests.js` — Node-runnable acceptance-criteria harness. `node tests.js`.

## Test

```
node tests.js
```

37 cases covering AC-1 through AC-D3 of the spec.

## Fork

Drop these four files into any GitHub Pages repo. No build step, no dependencies, no runtime network. Edit the denylist in `handoff.js` if you need a different policy.

## Security model

Threat: open redirect / phishing / XSS via the page's domain.

The page never inserts the decoded target into the DOM — only navigates to it. The denylist blocks the schemes a browser can weaponise; a custom app scheme can't be turned against the page's origin because the browser hands it to the OS, not back into the page.

Residual risk: a future browser version could ship a new renderable / executable / fallback scheme not in the denylist. Last addition to that class was `blob:` around 2012; the denylist must be reconfirmed against then-current stable releases of iOS / iPadOS / macOS Safari, desktop Chrome, and desktop Firefox at each audit.

## License

MIT.
