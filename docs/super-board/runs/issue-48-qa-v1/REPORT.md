# QA #48 · v1 · head `7271a89`

| AC | Resultado | Prueba |
|---|---|---|
| AC1 · con `language: "es"` los comentarios salen en español | ✅ | `prompt-render.txt`: la línea `Language:` está en los prompts de preflight, build, qa y review; en staging no está (`prompt-render-staging.txt`). `atlas-plugin.json` → `language: "es"`. `writing-standard.md` § 6 trae informe, bloqueo y 🙋 en español. |
| AC2 · `deps.sh` y `approval.py` leen los tokens | ✅ | `board-language-test.txt`: 5/5. `blocked-by: 32, 41` → `[32, 41]`; el 🙋 en español → `needsYou=true`, `humanGated=true`, y `approval.py` `BLOCK` lo reconoce. |
| AC3 · sin `language` no cambia nada | ✅ | Diff solo añade líneas (201+ / 0−). Ningún script lee `language`; la línea del prompt dice `Absent → English`. `npm-test.txt`: 46/46. |

## Huecos de test (no escritos)
- Medio: `super-board-codex-lane.sh` arma su propio prompt y no pasa `language` (backend codex).
- Medio: textos fijos en inglés de scripts: `super-qa-file-bug.sh` ("Seen again"), `super-board-stop.sh`, `super-board-run.sh` (backend legado).
- Bajo: el test fija el cableado de `LANGUAGE` con regex; `render-prompts.mjs` lo comprueba ejecutando la wave con agentes falsos.

## Repetir
- `npm test`
- `node docs/super-board/runs/issue-48-qa-v1/render-prompts.mjs .claude/workflows/super-board-wave.js .claude/super-board/configs/atlas-plugin.json`
