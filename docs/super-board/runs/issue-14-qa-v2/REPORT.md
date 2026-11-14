# QA #14 · v2 · against 8a67baa

Command: `npm test` (38/38 pass: 36 at `8a67baa` + 2 QA v2 tests). `npm run build` (`tsc -noEmit -skipLibCheck` + esbuild) clean. Logs: `npm-test.log`, `build.log`.

Round 2 fixed the reviewer's R1 and R2. This pass re-checks every AC and probes the two fixes.

| AC | Test | Result |
|---|---|---|
| AC1 at least 5 base rules, documented and tested | "hay al menos cinco reglas…", one test per rule; README "Linter de estilo" table | ✅ 5 rules, each with a positive and a negative case |
| AC2 pattern skills run and list line + message | "las skills con patrón…", "qa: un patrón que casa vacío…" | ✅ line, column, `nombre`, `severidad`; `ia` and invalid regex skipped |
| AC3 "Ignorar aquí" suppresses one finding in that note | "ignorar aquí suprime…", "qa: el comentario de ignorar…", "qa: ignorar aquí una skill…" | ✅ only that rule on that line; modal button covered by the manual check `tests/obsidian.md` § #14 |
| AC4 unit tests per rule without Obsidian | `node --test` imports `src/linter.ts` directly | ✅ no Obsidian runtime |

## Round-2 fixes probed

| Fix | QA v2 test | Witness |
|---|---|---|
| R1 scene breaks skipped | "qa v2: separadores de escena…" | `- - -`, `***`, `-----`, `_ _ _` give no finding; `- - Hola.` and `---Hola.` still flag `raya-dialogo` |
| R2 5-letter gerunds counted | "qa v2: «ando» (4 letras)…" | `Ando cansado, comiendo y bebiendo.` gives none; `Cuando … Fernando …` filtered with capitals; `dando`, `yendo`, `viniendo` flags |

Mutation check: each QA v2 test went red on its mutant and green on restore. Mutants: `SCENE_BREAK` without `\s*`, gerund guard `> 3`, guard `> 5` (the round-1 bug), and a case-sensitive `NOT_GERUNDS` lookup.

Non-visual ACs: no screenshots. This is a text engine, and the Obsidian UI cannot run headless.

## Test gaps (not written)
- Low: `— — —` (spaced em dashes) as a scene break is flagged `raya-dialogo`. It is not a Markdown thematic break.
- Low: names that end in `-ando` and are not in `NOT_GERUNDS` (`Armando`, `Hernando`) count as gerunds.
- Low: CRLF notes do not skip frontmatter (same as the other parsers).
- Low: `LintModal` / `lintNote` in Obsidian were not run here; the manual checklist covers them.
