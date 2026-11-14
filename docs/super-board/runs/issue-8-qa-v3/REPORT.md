# QA #8 · v3 · head 02e0f78

Run: `npm test` (24/24 pass, 23 Builder + 1 QA) · `npm run build` (tsc + esbuild clean).

| AC | Unit | View (real GraphView, shimmed DOM, headless Chromium) |
|---|---|---|
| AC1 nodes + typed edges | tests/graph.test.mjs:20, :79 folder link | desktop/tablet/mobile.png: 4 nodes, 4 labelled edges, no ghost node |
| AC2 type filter hides the rest | tests/graph.test.mjs:26 | ac2-tipo-rival-desktop.png: 2 `rival` edges only |
| AC3 chapter N shows only active | tests/graph.test.mjs:32, :57, :64, :110 | r3-capitulo-3/7-desktop.png: 3 edges at 3, 2 at 7 |
| AC4 unit test of temporal filter | tests/graph.test.mjs:32, :110 | n/a |
| R2 one project only | tests/graph.test.mjs:90, :104 | r2-otro-proyecto-desktop.png: only Elena–Zoe |
| R3 chapter = first number | tests/graph.test.mjs:35, :110 | Elena–Iván `rival` starts at `[[Cap 07 - parte 2]]`: absent at cap 3, present at cap 7 |

Node/edge/label counts per shot: `view-check.log` (no page errors).

R3 checked by mutation, each went red then restored:
- last number again (pre-R3 code): 2 fail (:32 Builder test, :110 QA test).
- chapter read from the link with its folder (`[[Libro 2/Cap 07]]` → 2): 1 fail (:110).
- the pre-R3 `src/graph.ts` bundled into the view: cap 3 shows 4 edges (the `rival` from "parte 2" leaks in); with `02e0f78` it shows 3.

QA added one test (:110): folder number (`Libro 2/`), scene number with alias, and the filter at caps 2, 3, 6, 7 for `[[Libro 2/Cap 07 - parte 3]]`.

Harness: `harness/` as v2, with Elena's `rival` `desde` changed to `[[Cap 07 - parte 2]]`.
Bundle: `npx esbuild harness/entry.js --bundle --format=esm --alias:obsidian=./harness/obsidian-shim.js --outfile=harness/bundle.js`,
serve `harness/` over http, open `index.html`, `?tipo=rival`, `?cap=3`, `?active=Otra/Personajes/Elena.md`.

## Test gaps (not written)
- Medium: the project comes from the active note via `characterFolder`; a note in `Novela/Lugares/` gives an empty graph (src/graph-view.ts:32). Carried from v2.
- Medium: the graph is read once on open; no refresh when the active note or a sheet changes (src/graph-view.ts:26). Carried from v2.
- Low: edge labels at the midpoint overlap where edges cross (`amiga`/`rival` in desktop.png).
- Low: in-app Obsidian check (tests/obsidian.md § #8) is manual; not run here.

## Branch state
2 commits behind staging; `git merge-tree` shows conflicts in `src/main.ts` and `tests/obsidian.md`.
