# QA #5 · v1 · against 820a206

Command: `npm test` (23/23 pass) and `npm run build` (tsc + esbuild clean). Logs: `npm-test.log`, `npm-build.log`.

| AC | Test | Result |
|---|---|---|
| AC1 template: description, origin, material/sentimental value, plot function | `tests/objects.test.mjs` "la plantilla trae…" | ✅ five sections + frontmatter keys; `newObject` command checked by hand only (`tests/obsidian.md` § #5) |
| AC2 frontmatter `posesiones[]` with holder + chapter | "lee la ficha…", "qa: posesiones desordenadas…" | ✅ wikilink and plain-number chapters; empty template `posesiones: []` reads as `[]` |
| AC3 helper answers "who has X in chapter N" | "lee la ficha…", "nadie tiene…", "qa: posesiones desordenadas…", "qa: dos cambios en el mismo capítulo…" | ✅ `holderAt` before first owner, order-independent, same-chapter tie takes the last entry |
| AC4 test covers two holder changes | "lee la ficha…" | ✅ Abuelo, then Elena (cap 4), then Marcos (cap 9) |

Mutation check: dropping `at >= since`, `>=` → `>` and the root `Objetos/` branch in `src/objects.ts` each turn a qa test red; source restored.

## Test gaps (not written)
- Medium: a zero-indent YAML list (`posesiones:` then `- poseedor: A` / `  capitulo: 1`) parses as `[]`. Valid YAML, but the parser expects the 2-space form Obsidian writes. Same as `estados` in places.
- Medium: `newObject` in `src/main.ts` (no Obsidian runtime in node tests). Covered by the manual check.
- Low: CRLF notes return empty frontmatter (same as the other parsers).
- Low: a chapter link with an earlier number in it (`[[Libro 2/Cap 04]]`) reads as chapter 2.
