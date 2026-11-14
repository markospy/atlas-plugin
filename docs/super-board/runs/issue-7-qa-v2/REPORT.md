# QA v2 · issue #7 · head 115f7fa (+ qa tests)

Commands: `npm test` (37/37) · `npm run build` (clean).

| AC | Unit test | Component / e2e |
|---|---|---|
| AC1 índice lista personajes, lugares y objetos | `tests/entities.test.mjs:38`, `:119` | n/a: Obsidian panel, manual `tests/obsidian.md` § #7 |
| AC2 escenas por nombre o alias | `:50`, `:132`, `:152` (lista de bloque, R1), `:172` (coma entre comillas, R2), `:196` (qa v2) | manual § #7 |
| AC3 re-escaneo sin duplicar | `:70`, `:215` (qa v2: quitar un alias) | manual § #7 |
| AC4 dos alias del mismo personaje | `:82`, `:152` | n/a |

Mutants on `src/frontmatter.ts` (restored after each):

| Mutant | Result |
|---|---|
| block list never stops (`break` → `continue`) | red, only on qa v2 `:196` |
| block branch removed | red, 6 tests |
| inline list split on every comma | red, R2 test |
| block items need no indent (`\s+` → `\s*`) | green: unindented lists untested |

Test gaps (not written):
- Medium: `alias:` + unindented `- Ele` (valid YAML, written by hand) gives `[]`
- Medium: `EntityView.refresh` and the `scan-entities` command have no test (no Obsidian runtime)
- Low: `alias: [Ele] # nota` reads one alias `[Ele] # nota`
- Low: a blank line inside a block list ends the list
- Low: a scene's own frontmatter counts as a mention

No screenshots: the panel runs only inside Obsidian.
