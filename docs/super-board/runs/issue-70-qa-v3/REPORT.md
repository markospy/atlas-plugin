# QA #70 v3 · PR #75 @ `d6acca4`

Resultado: ❌ falla (hueco High, regresión frente a `staging` `4692062`)

## AC
| AC | Prueba | Resultado |
|---|---|---|
| AC1 cierre `--- ` con espacios | `tests/extract-qa.test.mjs:128`, `tests/frontmatter-end.test.mjs:19` | ✅ |
| AC2 lista `hechos: [{...}]` en línea | `tests/extract-qa.test.mjs:138`, `:147`, `:179`, `:190`; sondas coma final y comentario (`probe.log`) | ✅ |
| AC3 casos previos en verde | `tests/extract-qa.test.mjs:30-123`, `:206`, `:217` | ✅ |
| AC4 `npm test` entero | 381 tests, 380 pasan, 1 falla: `tests/export.test.mjs:97` (nuevo, QA v3) | ❌ |

## Hueco High (regresión, pérdida de texto en el export)
- Testigo: escena `---\n"Hola", dijo ella.\n---\nTras una pausa.` (también `{Nota del autor}`)
- `staging`: el export conserva el bloque como texto de la escena
- Rama: `frontmatterYaml` (`src/frontmatter.ts:57`) toma cualquier YAML inválido por frontmatter; `sceneText` (`src/export.ts:78`) borra la prosa del manuscrito
- Esperado: un bloque inválido es frontmatter solo si su primera línea se lee como `clave:` (como hace `noteBody`); el caso R1 `titulo: Capítulo 1: El inicio` sigue quitándose
- Test rojo: `tests/export.test.mjs:97` (verde en `staging`)

## Huecos sin escribir
- Low: `hechos: [] # a mano` pierde el comentario al pasar a lista en bloque (ya lo anotó el builder)
- Low: en una lista en flujo de varias líneas la entrada nueva va en la misma línea que la última

## Comandos
- `npm test` → `npm-test.log`
- `npm run build` → `build.log` (limpio)
- `node --experimental-strip-types docs/super-board/runs/issue-70-qa-v3/probe.mjs` → `probe.log`
