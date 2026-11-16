# QA #10 · v1 · against bccef30

Command: `npm test` (16/16 pass) plus `npx tsc -noEmit -skipLibCheck` and `node esbuild.config.mjs production`. Log: `npm-test.log`.

| AC | Test | Result |
|---|---|---|
| AC1 template `_Memoria/Cap NN.md` with `hechos` and `conocimiento` | `tests/memory.test.mjs:48` | ✅ `Cap 03` name, `Novela/_Memoria` folder, both lists empty and parsed back |
| AC2 query "what [[Elena]] knows in ch. N" and "what the reader knows in ch. N" | `tests/memory.test.mjs:57`, `:68`, `:89` (QA) | ✅ `[[Elena]]`, `elena`, `[[Elena\|la Doctora]]`, `lector`, `[[lector]]`; only chapters ≤ N count; latest state wins; ch. 2 before the first memory → empty |
| AC3 states ignora, sospecha, cree-falso, sabe | `tests/memory.test.mjs:78` | ✅ all four accepted; `intuye` warned and left out of the query |
| AC4 a fact the character knows and the reader only suspects | `tests/memory.test.mjs:57` | ✅ Elena `sabe`, lector `sospecha`, Iván nothing |

QA test `:89` was seen red: dropping `toLowerCase()` in `holderKey` and widening the chapter filter to `chapter + 1` each fail it; both mutations were reverted.

The two commands in `src/main.ts` are not run here: node tests have no Obsidian runtime. Typecheck and production build are clean.

## Test gaps (not written)
- Medium: CRLF notes parse as empty (`capitulo: 0`, no facts) with no warning. Witness: the `CAP_03` fixture with `\r\n`.
- Medium: YAML lists written with zero indent (`- id: padre`, valid YAML) are dropped silently. Witness: `hechos:\n- id: padre\n  texto: x`.
- Medium: a chapter in a subfolder (`Novela/Manuscrito/Parte 1/Cap 03.md`) resolves memory to `Novela/Manuscrito/Parte 1/_Memoria`, not `Novela/_Memoria`.
- Medium: `newMemory` and `whatKnowsHere` in `src/main.ts` have no automated test (no Obsidian runtime).
- Low: an inline YAML comment (`estado: sabe # ok`) reads as the invalid state `sabe # ok`; it is warned, not silent.
- Low: `chapterNumber("Recap 5.md")` returns 5.
