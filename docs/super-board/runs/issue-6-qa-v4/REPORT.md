# QA #6 v4 — plot: arcos, escenas y beats

Head probado: `34b7ba0` (R4, R5 y R6 arreglados; merge de `staging` `8563d94`) más el test nuevo de este pase. Comandos: `npm test` (92/92) · `npm run build` (exit 0). Logs: `npm-test.log`, `build.log`.

## Ledger de AC

| AC | Unit | Component | e2e |
|---|---|---|---|
| AC1 nota de trama bajo `Trama/` con secciones | `tests/plot.test.mjs:35` (secciones, beats) · `:50` (carpeta desde cualquier nota) · `:100` (frontmatter releído) | n/a: runtime de Obsidian | manual: `tests/obsidian.md` § #6 |
| AC2 la escena declara objetivo, conflicto, resultado, POV, subtrama | `tests/plot.test.mjs:17` · `:58` (vacíos, claves parecidas) · `:78` (escapes) · `:87` (CRLF) · `:93` (comillas simples) | n/a: `processFrontMatter` necesita Obsidian | manual: `tests/obsidian.md` § #6 |
| AC3 esqueleto de estructura documentado | `tests/plot.test.mjs:36` (3 esqueletos) · `:100` (`estructura` por esqueleto) · README § Trama | n/a | n/a |
| AC4 un test parsea una escena con esos campos | `tests/plot.test.mjs:17` | n/a | n/a |

## Comprobación de R5

- `parseScene` usa `frontmatterBody` y `scalar` de `src/frontmatter.ts`; los gaps Medium de v3 (CRLF, comillas simples) tienen test en `:87` y `:93`.

## Test nuevo

- `tests/plot.test.mjs:100` relee `tipo`, `nombre` y `estructura` de la nota de cada esqueleto, también con `El "Rey" pálido`.
- Mutante `tipo: plot` → 2 fallos. Mutante sin `JSON.stringify` en `nombre` sobrevive: `unquote` recorta las comillas exteriores aunque `JSON.parse` falle.

## Test gaps (not written)

- Medium: los comandos `newPlot` / `addSceneFields` solo los cubre el checklist manual de Obsidian.
- Low: valores de bloque (`objetivo: |`) se leen como `|`.
