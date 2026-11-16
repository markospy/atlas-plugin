# QA #13 · v1 · against 73a2fc5

Command: `npm test` (17/17 pass, includes `npm run build`). Log: `npm-test.log`.

| AC | Test | Result |
|---|---|---|
| AC1 command creates skill under `Estilo/` with full frontmatter | `tests/style.test.mjs` "la plantilla…", "qa: la skill se crea en Estilo/…" | ✅ template + folder resolution; command itself not run in Obsidian (manual check added to `tests/obsidian.md` § #13) |
| AC2 severities sugerencia / aviso / obligatoria | "severidades válidas…", "qa: las tres severidades…" | ✅ all three read; unknown falls back to `aviso` |
| AC3 `verificacion: patron` exposes the pattern | "severidades válidas…", "qa: … el patrón se oculta con verificación ia" | ✅ single- and double-quoted patterns; hidden under `ia` |
| AC4 load and filter by scope personaje | "filtra skills…", "qa: filtro por personaje…" | ✅ multi-target `aplica_a`, `capítulo` scope, unknown scope → `global` |

## Test gaps (not written)
- Medium: `newSkill` in `src/main.ts` (no Obsidian runtime in node tests) — covered by manual check.
- Low: CRLF notes return empty frontmatter (same as the other parsers).
