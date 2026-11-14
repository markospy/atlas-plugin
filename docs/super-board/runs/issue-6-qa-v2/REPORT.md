# QA #6 v2 — plot: arcs, scenes, beats templates

Head tested: `ca1a4d8` (rebase on `staging` `0a355b5` + `sheetFolder` reuse). Commands: `npm test` (21/21) · `npm run build` (exit 0). Logs: `npm-test.log`, `build.log`.

## AC ledger

| AC | Unit | Component | e2e |
|---|---|---|---|
| AC1 plot note under `Trama/` with sections | `tests/plot.test.mjs:35` (sections, beats) · `:50` (folder from any note, now via `sheetFolder`) | n/a: Obsidian runtime | manual: `tests/obsidian.md` § #6 |
| AC2 scene declares objetivo, conflicto, resultado, POV, subtrama | `tests/plot.test.mjs:17` · `:58` (empty, unquoted, similar keys) | n/a: `processFrontMatter` needs Obsidian | manual: `tests/obsidian.md` § #6 |
| AC3 documented structure skeleton | `tests/plot.test.mjs:36` (3 structures) · README § Trama | n/a | n/a |
| AC4 test parses a scene with those fields | `tests/plot.test.mjs:17` | n/a | n/a |

## Rebase check

- Merge kept both sides: `src/main.ts` registers plot commands and the `Estilo/` command from `0a355b5`; README has § Trama and § Estilo.
- `sheetFolder` export in `src/places.ts` is used by places and plot; places tests still pass.

## Probes (not committed)

- `objetivo: "a \"b\""` → `a "b"` ok · `objetivo: Elena: quiere` → `Elena: quiere` ok · empty frontmatter `---\n---` → all empty ok.
- `plotNote('Nov"ela')` escapes the name in YAML ok.

## Test gaps (not written)

- Medium: CRLF note (`---\r\n`) makes `parseScene` return all empty (`src/plot.ts` `frontmatterBody`).
- Medium: single-quoted value `pov: '[[Elena]]'` keeps the quotes (`src/plot.ts` `scalar`; same as `src/places.ts:89`).
- Medium: `newPlot` / `addSceneFields` commands only covered by the manual Obsidian checklist.
- Low: block-scalar values (`objetivo: |`) read as `|`.
