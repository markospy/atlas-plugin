# QA #8 · v4 · head b1208a2 (pase de rebase)

Run: `npm test` 63/63 (24 del grafo + los de `staging`) · `npm run build` (tsc + esbuild limpio).

| AC | Unit | Vista (GraphView real, DOM shim, Chromium headless) |
|---|---|---|
| AC1 nodos + aristas tipadas | tests/graph.test.mjs:21, :80 enlace con carpeta | desktop/tablet/mobile.png: 4 nodos, 4 aristas, sin nodo fantasma |
| AC2 filtro por tipo | tests/graph.test.mjs:27 | ac2-tipo-rival-desktop.png: solo 2 aristas `rival` |
| AC3 capítulo N | tests/graph.test.mjs:32, :58, :65, :110 | r3-capitulo-3/7-desktop.png: 3 aristas en cap 3, 2 en cap 7 |
| AC4 test del filtro temporal | tests/graph.test.mjs:32, :110 | n/a |
| R2 un solo proyecto | tests/graph.test.mjs:91, :105 | r2-otro-proyecto-desktop.png: solo Elena–Zoe |

Conteos por captura: `view-check.log` (sin errores de página); idénticos a v3.

## Merge con staging (`e6790b5`)
- `git diff origin/staging...b1208a2 -- src/main.ts tests/obsidian.md`: solo añadidos (import, registerView, comando, `openGraph`, sección #8).
- `plugin-smoke.log`: `src/main.ts` empaquetado con un shim de Obsidian, `onload()` registra las vistas `atlas-markers`, `atlas-graph`, `atlas-entities` y 11 comandos sin ids repetidos (`show-relation-graph`, `scan-entities`, `new-object`, `new-skill` presentes).
  Bundle: `npx esbuild src/main.ts --bundle --format=esm --platform=node --alias:obsidian=./harness/plugin-shim.js --outfile=plugin.mjs` · `node harness/plugin-smoke.mjs ./plugin.mjs`.

Harness de la vista: `harness/` igual que v3. Bundle: `npx esbuild harness/entry.js --bundle --format=esm --alias:obsidian=./harness/obsidian-shim.js --outfile=harness/bundle.js`, servir `harness/` por http, abrir `index.html`, `?tipo=rival`, `?cap=3`, `?active=Otra/Personajes/Elena.md`.

## Test gaps (not written)
- Medium: el proyecto sale de la nota activa vía `characterFolder`; una nota en `Novela/Lugares/` da grafo vacío (src/graph-view.ts:32). Viene de v2.
- Medium: el grafo se lee una vez al abrir; no se refresca al cambiar la nota activa o una ficha (src/graph-view.ts:26). Viene de v2.
- Low: las etiquetas de arista se solapan donde las aristas se cruzan (`amiga`/`rival` en desktop.png).
- Low: el checklist en Obsidian real (tests/obsidian.md § #8) es manual; no se ejecutó aquí.

## Estado de la rama
`git merge-tree` contra `origin/staging`: sin conflictos.
