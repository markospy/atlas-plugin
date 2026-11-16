# QA v4 · issue #25 · writing: metas y estadísticas

Head probado: `56d032b` (rebase del builder: fusiona `staging` `92b00bc`, choque de imports en `src/main.ts`).
Esta pasada comprueba que la fusión no rompió nada de #25. El código de metas no cambió desde QA v3 (`887abf2`).
ACs sin UI propia: el aviso es un `Notice` de Obsidian; se prueba el texto exacto con el comando real de `src/main.ts` y un Obsidian simulado. Sin capturas.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 palabras totales del manuscrito | `tests/stats.test.mjs:22` · `tests/stats-runtime.test.mjs:112` · `:210` · `:218` | ✅ |
| AC2 meta diaria configurable y progreso del día | `tests/stats.test.mjs:33` · `:69` · `tests/stats-runtime.test.mjs:121` | ✅ |
| AC3 racha calculada en local | `tests/stats-edges.test.mjs:14` · `tests/stats-runtime.test.mjs:131` `:174` `:189` `:199` `:229` | ✅ |
| AC4 test del cálculo de progreso | `tests/stats.test.mjs:33`, `:47` | ✅ |

## Revisión de la fusión
- `src/main.ts`: imports de staging (`peek`, `stale`, `dependencies`) y de metas (`AtlasSettings`, `stats`) conviven; `ProviderSettings` se quitó porque ya no se usa. `tsc` limpio.
- `saveData`/`loadData` solo se llaman en `src/main.ts:93` y `:853`: lo nuevo de staging guarda en `.atlas/propagacion.json`, no en `data.json`, así que no pisa `escritura`.
- Comandos de staging (`show-entity-peek`, `fact-dependents`, `propagate-changes`, `stale-chapters`) y `writing-progress` se registran juntos en `onload`; los tests de runtime cargan el plugin entero y pasan.

## Hilos `[qa]`
- R5 resuelto: aplazado a #72 por decisión del dueño.

## Test gaps (no escritos)
- Low: escena en una subcarpeta llamada `Personajes/` dentro de `Manuscrito/` (igual que v3).
- Low: "1.000" cuenta como 2 palabras (igual que v3).
- Checks manuales de `tests/obsidian.md` § #25: en #72.

## Commands
- `npm test`: 336/338 (`npm-test.log`). Los 2 fallos son `tests/extract-qa.test.mjs:128` y `:138` (#19); también fallan en `staging` `92b00bc` sin #25 (9/11 en ese archivo).
- `node --experimental-strip-types --test tests/stats*.test.mjs`: 20/20.
- `npm run build`: tsc + esbuild limpio (`npm-build.log`).
