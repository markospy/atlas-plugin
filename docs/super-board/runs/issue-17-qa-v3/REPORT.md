# QA v3 · issue #17 · PR #64 @ `81ac54c`

| AC | Resultado | Prueba |
|---|---|---|
| AC1 lista de hallazgos con tipo y ancla | ✅ | `tests/review.test.mjs:45`, `tests/review-readonly.test.mjs:28`, CRLF nuevo en `tests/review-readonly.test.mjs:44` |
| AC2 no modifica el manuscrito | ✅ | `tests/review-readonly.test.mjs:18` (sin APIs de escritura en `reviewWithAi` ni `ReviewModal`), `tests/review.test.mjs:83` |
| AC3 sin proveedor, mensaje claro | ✅ | `tests/review.test.mjs:93`, `tests/review.test.mjs:105` |
| AC4 test con proveedor mock | ✅ | `tests/review.test.mjs:45` (mock `send`) |
| R7 respuesta cortada con `[[enlaces]]` | ✅ | `tests/review.test.mjs:150`; sonda: 200 KB en 25 ms |
| R8 `projectOf` único | ✅ | `tests/sheets.test.mjs:82`, `tests/review-readonly.test.mjs:37` |

- `npm test`: 215/215 (`npm-test.log`)
- `tsc -noEmit -skipLibCheck`: limpio (`tsc.log`)
- Sin capturas: no hay Obsidian ni display aquí; check manual en `tests/obsidian.md` § #17

## Test gaps (not written)
- Medium · `src/review.ts:122` `firstArray` sigue siendo cuadrático con muchos `[{` sin cerrar: 100 KB de `[{` tarda ~15 s, 60 KB de `[{ ` dentro de un string ~3 s. Ningún modelo real responde así; las respuestas cortadas reales (R7) van en 25 ms.
- Low · un array cuyo primer elemento no es objeto (`[null, {...}]`) se ignora entero y da "sin JSON".

## Merge
- La rama va 1 commit detrás de `staging` (`f15e433`, co-escritura #18) y choca en `src/main.ts`, `src/settings.ts` y `tests/obsidian.md`. Lo resuelve la pasada de rebase del Builder.
