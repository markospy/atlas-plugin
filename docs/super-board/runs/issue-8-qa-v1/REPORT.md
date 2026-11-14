# QA #8 · v1 · head 2cefba9

Run: `npm test` (20/20 pass) · `npm run build` (tsc + esbuild clean).

| AC | Unit | View (real GraphView, shimmed DOM, headless Chromium) |
|---|---|---|
| AC1 nodes + typed edges | tests/graph.test.mjs:20 | desktop/tablet/mobile.png: 4 nodes, 4 labelled edges |
| AC2 type filter hides the rest | tests/graph.test.mjs:26 | ac2-tipo-rival-desktop.png: 2 `rival` edges only |
| AC3 chapter N shows only active | tests/graph.test.mjs:31, single-chapter + open-bound tests | ac3-capitulo-3/7-desktop.png: Iván rival absent at 3, present at 7 |
| AC4 unit test of temporal filter | tests/graph.test.mjs:31 | n/a |

QA added 5 edge tests (alias/heading links, empty `con`, single-chapter bound,
non-numeric bound open, empty filter, 0/1-node layout); each seen red by a mutation
of the guarded line in src/graph.ts, then restored.

Harness: `harness/` bundles src/graph-view.ts with esbuild, `obsidian` aliased to
`harness/obsidian-shim.js`; open `index.html?tipo=rival` or `?cap=3` over http.

## Test gaps (not written)
- Medium: `[[Personajes/Marcos]]` (folder path) gives node `Personajes/Marcos`, a second node beside `Marcos` (src/graph.ts:28, linkTarget keeps the path).
- Medium: GraphView reads every `Personajes/` folder in the vault, so two projects merge into one graph (src/graph-view.ts:106).
- Low: edge labels sit at the midpoint, so crossing edges overlap (`amiga`/`rival` in desktop.png).
- Low: in-app Obsidian check (tests/obsidian.md § #8) is manual; not run here.
