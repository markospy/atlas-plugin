# QA #8 · v2 · head 01d4566

Run: `npm test` (23/23 pass) · `npm run build` (tsc + esbuild clean).

| AC | Unit | View (real GraphView, shimmed DOM, headless Chromium) |
|---|---|---|
| AC1 nodes + typed edges | tests/graph.test.mjs:20, :79 folder link | desktop/tablet/mobile.png: 4 nodes, 4 labelled edges; `[[Personajes/Marcos]]` lands on `Marcos`, no ghost |
| AC2 type filter hides the rest | tests/graph.test.mjs:26 | ac2-tipo-rival-desktop.png: 2 `rival` edges only |
| AC3 chapter N shows only active | tests/graph.test.mjs:31, :57, :64 | ac3-capitulo-3/7-desktop.png: 3 edges at 3, 2 at 7 |
| AC4 unit test of temporal filter | tests/graph.test.mjs:31 | n/a |
| R2 one project only | tests/graph.test.mjs:90, :104 | desktop.png has no `Zoe`; r2-otro-proyecto-desktop.png (active note in `Otra/`) shows only Elena–Zoe |

Node/edge/label counts per shot: `view-check.log` (no page errors).

Checked R1/R2 fix tests by mutation, each went red: `linkTarget` without the
basename step (1 fail), `projectCharacterPaths` prefix without `/` (2 fail),
nested subfolders allowed (1 fail). QA added one test (:104): `Novela/Personajes2`,
`OtraNovela/Personajes` and `Personajes/Secundarios/` stay out.

Harness: `harness/` as v1, plus `app.workspace.getActiveFile` and a second project.
Bundle: `npx esbuild harness/entry.js --bundle --format=esm --alias:obsidian=./harness/obsidian-shim.js --outfile=harness/bundle.js`,
serve `harness/` over http, open `index.html`, `?tipo=rival`, `?cap=3`, `?active=Otra/Personajes/Elena.md`.

## Test gaps (not written)
- Medium: the project comes from the active note via `characterFolder`, so with a note in `Novela/Lugares/` open the graph reads `Novela/Lugares/Personajes` and shows "No hay fichas" (src/graph-view.ts:32). Same rule as **Nueva ficha de personaje**.
- Medium: the graph is read once on open; it does not refresh when the active note or a sheet changes (src/graph-view.ts:26).
- Low: R3 still open: `chapterNumber` takes the last number, `[[Cap 07 - parte 2]]` gives 2 (src/graph.ts:44).
- Low: edge labels at the midpoint overlap where edges cross (`amiga`/`rival` in desktop.png).
- Low: in-app Obsidian check (tests/obsidian.md § #8) is manual; not run here.
- Branch is 1 commit behind staging; `git merge-tree` shows a conflict in tests/obsidian.md only.
