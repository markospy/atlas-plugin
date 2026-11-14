# QA #6 v1 — plot: arcs, scenes, beats templates

Head tested: `ee76871` plus QA tests. Commands: `npm test` (15/15) · `npm run build` (exit 0). Logs: `npm-test.log`, `build.log`.

## AC ledger

| AC | Unit | Component | e2e |
|---|---|---|---|
| AC1 plot note under `Trama/` with sections | `tests/plot.test.mjs:35` (sections, beats) · `:50` (folder from any note) | n/a: Obsidian runtime | manual: `tests/obsidian.md` § #6 |
| AC2 scene declares objetivo, conflicto, resultado, POV, subtrama | `tests/plot.test.mjs:17` · `:58` (empty, unquoted, similar keys) | n/a: `processFrontMatter` needs Obsidian | manual: `tests/obsidian.md` § #6 |
| AC3 documented structure skeleton | `tests/plot.test.mjs:36` (3 structures) · README § Trama | n/a | n/a |
| AC4 test parses a scene with those fields | `tests/plot.test.mjs:17` | n/a | n/a |

## Mutants checked (red seen, restored)

- frontmatter end ignored: red
- key regex accepts `objetivos:`: red
- `plotFolder` inside `Trama/` returns the note path: red
- root fallback `"Trama"` changed: red

## Test gaps (not written)

- Medium: CRLF note (`---\r\n`) makes `parseScene` return all empty (`src/plot.ts` `frontmatterBody`).
- Medium: `newPlot` / `addSceneFields` commands only covered by the manual Obsidian checklist.
- Low: block-scalar values (`objetivo: |`) read as `|`.
