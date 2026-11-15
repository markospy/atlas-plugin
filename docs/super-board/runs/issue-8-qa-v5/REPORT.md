# QA #8 · v5 · head f5dbdf6 (ronda 7: R7 `hasta` exclusivo)

Run: `npm test` 64/64 · `npm run build` limpio (tsc + esbuild) · `staging` mezclada en un árbol temporal: 113/113 y build limpio (`merge-staging.log`), sin conflictos.

| AC | Unit | Vista (GraphView real, DOM shim, Chromium headless) |
|---|---|---|
| AC1 nodos + aristas tipadas | tests/graph.test.mjs:23, :94 | desktop/tablet/mobile.png: 4 nodos, 6 aristas |
| AC2 filtro por tipo | tests/graph.test.mjs:29 | ac2-tipo-rival-desktop.png: solo las 2 aristas `rival` |
| AC3 capítulo N | tests/graph.test.mjs:34, :62, :124 | ac3-capitulo-3: Marcos–Iván `hasta Cap 03` ya no sale · r7-capitulo-9: `aliado` · r7-capitulo-10: `enemigo`, sin `aliado` |
| AC4 test del filtro temporal | tests/graph.test.mjs:34, :62 | n/a |
| R2 un solo proyecto | tests/graph.test.mjs:105, :119 | r2-otro-proyecto-desktop.png: solo Elena–Zoe |

Conteos por captura: `view-check.log`.

## Mutantes (no commiteados)
- `chapter < edge.hasta` → `<=` en src/graph.ts:79: 2 tests en rojo (:34, :62).
- `linkTarget` sin quitar la carpeta: 3 tests en rojo (:94, :124, :134).

## Harness
`harness/entry.js` = fixture v4 + Elena–Iván `aliado` hasta `[[Cap 10]]` y `enemigo` desde `[[Libro 2/Cap 10]]`.
Bundle: `npx esbuild harness/entry.js --bundle --format=esm --alias:obsidian=./harness/obsidian-shim.js --outfile=harness/bundle.js`, servir `harness/` por http, abrir `index.html`, `?tipo=rival`, `?cap=3|9|10`, `?active=Otra/Personajes/Elena.md`.
Carpeta v4 borrada (R5); sus capturas siguen en `a7e9167`.

## Test gaps (not written)
- Medium: dos relaciones entre el mismo par se dibujan en la misma línea y sus etiquetas se pisan (`enemigo`/`rival` en r7-capitulo-10-desktop.png; src/graph-view.ts:88).
- Medium: el proyecto sale de la nota activa vía `characterFolder`; una nota en `Novela/Lugares/` da grafo vacío (src/graph-view.ts:32). Viene de v2.
- Medium: el grafo se lee una vez al abrir; no se refresca al cambiar la nota activa o una ficha (src/graph-view.ts:26). Viene de v2.
- Low: el checklist en Obsidian real (tests/obsidian.md § #8) es manual; no se ejecutó aquí.
