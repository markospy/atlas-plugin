# QA #70 v4 · PR #75 @ `7a541b9`

Resultado: ✅ pasa

## AC
| AC | Prueba | Resultado |
|---|---|---|
| AC1 cierre `--- ` con espacios | `tests/extract-qa.test.mjs:128`, `tests/memory-frontmatter.test.mjs:8`, nuevo CRLF + `---  ` (`tests/extract-qa.test.mjs:232`); sondas `crlf_close_spaces`, `close_tab`, `flow_inline_spaces_close` | ✅ |
| AC2 lista `hechos: [{...}]` en línea | `tests/extract-qa.test.mjs:138`–`:191`; sondas v3 (coma final, comentario, varias líneas) y v4 | ✅ |
| AC3 casos previos en verde | `tests/extract-qa.test.mjs:41`–`:123`, `:206`, `:217`; sonda `comments_and_spaced_props` | ✅ |
| AC4 `npm test` entero | 383/383 (`npm-test.log`) · rama al día con `staging` `4692062` | ✅ |
| AC5 `src/export.ts` y `frontmatterEnd` sin cambios | `git diff origin/staging...HEAD -- src/export.ts src/frontmatter.ts` vacío | ✅ |
| AC6 `tests/export.test.mjs` entero | verde, incluido `:97`; sonda export conserva `"Hola", dijo ella.` y `{Nota del autor}` como en `staging` | ✅ |

## Huecos sin escribir
- Low: `capitulo: 3 # cap` se lee como 0 (lector común `scalar`, igual que en `staging`; no corrompe la nota)
- Low: `hechos: [] # a mano` pierde el comentario al pasar a lista en bloque (anotado en v3)

## Comandos
- `npm test` → `npm-test.log`
- `npm run build` → `build.log` (limpio)
- `node --experimental-strip-types docs/super-board/runs/issue-70-qa-v4/probe.mjs` → `probe.log`
- sonda v3 sobre `7a541b9`: memoria igual que v3; export ya conserva la prosa
