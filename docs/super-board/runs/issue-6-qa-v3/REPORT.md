# QA #6 v3 — plot: arcos, escenas y beats

Head probado: `6295a17` (rebase sobre `staging` `458f950`) más el test nuevo de este pase. Comandos: `npm test` (55/55) · `npm run build` (exit 0). Logs: `npm-test.log`, `build.log`.

## Ledger de AC

| AC | Unit | Component | e2e |
|---|---|---|---|
| AC1 nota de trama bajo `Trama/` con secciones | `tests/plot.test.mjs:35` (secciones, beats) · `:50` (carpeta desde cualquier nota) | n/a: runtime de Obsidian | manual: `tests/obsidian.md` § #6 |
| AC2 la escena declara objetivo, conflicto, resultado, POV, subtrama | `tests/plot.test.mjs:17` · `:58` (vacíos, sin comillas, claves parecidas) · `:78` (escapes, comilla suelta) | n/a: `processFrontMatter` necesita Obsidian | manual: `tests/obsidian.md` § #6 |
| AC3 esqueleto de estructura documentado | `tests/plot.test.mjs:36` (3 esqueletos) · README § Trama | n/a | n/a |
| AC4 un test parsea una escena con esos campos | `tests/plot.test.mjs:17` | n/a | n/a |

## Comprobación del rebase

- `src/main.ts` registra los comandos de trama junto a los de `staging` `458f950`; README conserva § Trama.
- `sheetFolder` exportado en `src/places.ts` lo usan lugares y trama; los tests de lugares siguen verdes.

## Test nuevo (visto en rojo)

- `tests/plot.test.mjs:78` fija `"Dijo \"no\""` → `Dijo "no"` y una comilla suelta `"` → `"`.
- Mutantes probados y revertidos: `value.length > 1` → `> 0` (1 fallo) · quitar `JSON.parse` (1 fallo).

## Test gaps (not written)

- Medium: nota CRLF (`---\r\n`) hace que `parseScene` devuelva todo vacío (`src/plot.ts` `frontmatterBody`).
- Medium: valor con comillas simples `pov: '[[Elena]]'` conserva las comillas (`src/plot.ts` `scalar`).
- Medium: los comandos `newPlot` / `addSceneFields` solo los cubre el checklist manual de Obsidian.
- Low: valores de bloque (`objetivo: |`) se leen como `|`.
