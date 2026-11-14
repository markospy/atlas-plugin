# QA #14 · v1 · against dd0cda8

Command: `npm test` (30/30 pass, includes `npm run build`). `tsc -noEmit -skipLibCheck` clean. Log: `npm-test.log`.

| AC | Test | Result |
|---|---|---|
| AC1 at least 5 base rules, documented and tested | `tests/linter.test.mjs` "hay al menos cinco reglas…", one test per rule; README "Linter de estilo" table | ✅ 5 rules (`raya-dialogo`, `gerundios-encadenados`, `dijo-repetido`, `mente-acotacion`, `dequeismo`), each with a positive and negative case; "qa: dos gerundios…" pins the threshold |
| AC2 pattern skills run and list line + message | "las skills con patrón…", "qa: un patrón que casa vacío…" | ✅ line, column, `nombre` as message, skill `severidad`; `ia` and invalid regex skipped; zero-length pattern terminates |
| AC3 "Ignorar aquí" suppresses one finding in that note | "ignorar aquí suprime…", "qa: el comentario de ignorar…", "qa: ignorar aquí una skill…" | ✅ comment on that line only, idempotent, columns unchanged, other rules and lines still fire; modal button not run in Obsidian (manual check in `tests/obsidian.md` § #14) |
| AC4 unit tests per rule without Obsidian | `node --test` imports `src/linter.ts` directly | ✅ no Obsidian runtime needed |

Mutation check: each new `qa:` test went red on a mutant (`>= 3` to `>= 2`, comment removed instead of blanked, ignore applied note-wide, `lastIndex++` dropped) and green on restore.

Non-visual ACs: no screenshots (pure text engine; Obsidian UI not available headless).

## Test gaps (not written)
- Medium: a `---` scene break (or unclosed frontmatter) is flagged `raya-dialogo`; manuscripts use `---` between scenes. Witness: `"Fin.\n\n---\n\nOtra escena."` gives `3:raya-dialogo`.
- Medium: `gerundios-encadenados` skips 5-letter gerunds `dando`, `yendo` (`length > 5`). Witness: `"Iba dando tumbos, yendo y viniendo."` gives no finding.
- Low: zero-length skill patterns (`x*`) yield one empty finding per position.
- Low: CRLF notes do not skip frontmatter (same as the other parsers).
- Low: `LintModal` / `lintNote` in Obsidian not run here; covered by the manual checklist.
