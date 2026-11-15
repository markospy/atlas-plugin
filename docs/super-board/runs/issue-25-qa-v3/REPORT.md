# QA v3 · issue #25 · writing: metas y estadísticas

Head probado: `408f131` (rebuild 2: R3 R4 R6 R7 R8) más los commits de QA v3. Se fusionó `staging` (`35242d7`) en la rama: un conflicto de texto en `tests/obsidian.md` (#25 y #28 añaden su sección al final), resuelto con las dos secciones.
ACs sin UI propia: el aviso es un `Notice` de Obsidian; se prueba el texto exacto con el comando real de `src/main.ts` y un Obsidian simulado. Sin capturas.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 palabras totales del manuscrito | `tests/stats.test.mjs:22` · `tests/stats-runtime.test.mjs:112` aviso "Manuscrito: 5 palabras" · `:210` Manuscrito/ vacío da 0 · `:218` subcarpeta de capítulo | ✅ |
| AC2 meta diaria configurable y progreso del día | `tests/stats.test.mjs:33` · `:69` parseo estricto (R3) · `tests/stats-runtime.test.mjs:121` meta 0 recargada de data.json | ✅ |
| AC3 racha calculada en local | `tests/stats.test.mjs:47` · `tests/stats-edges.test.mjs:14` · `tests/stats-runtime.test.mjs:131`, `:189` borrar, `:199` y `:229` mover, `:174` onunload; sin red, solo data.json | ✅ |
| AC4 test del cálculo de progreso | `tests/stats.test.mjs:33`, `:47` | ✅ |

## Arreglos del rebuild 2
- R3 `500abc`/`abc` rechazados: `tests/stats.test.mjs:69`.
- R4 borrar y mover recuentan: `tests/stats-runtime.test.mjs:189`, `:199`.
- R6 `onunload` ejecuta los recuentos pendientes: `:174`.
- R7 `yesterday` por fecha de calendario, no 24 h: `:109`.
- R8 `Manuscrito/` vacío avisa 0 palabras: `:210`.

## QA v3: tests nuevos
- `:218` escena en `Manuscrito/Parte 1/` recuenta el proyecto. Visto en rojo con la raíz calculada como carpeta padre, restaurado.
- `:229` mover una escena a `Personajes/` recuenta solo el origen. Visto en rojo quitando `scheduleWordCount(file, oldPath)`, restaurado.

## Integración con staging
- Tras fusionar, 15 tests de runtime fallaban por stubs: `tests/backup-runtime.test.mjs` sin `registerEvent`/`vault.on` (que #25 usa en `onload`) y `tests/stats-runtime.test.mjs` sin `FuzzySuggestModal` (que #28 usa). Arreglado solo en los stubs.
- 2 fallos ya están en `staging` sin #25: `tests/extract-qa.test.mjs:128` y `:138` (#19, extracción de memoria). No son de este ticket.

## Test gaps (no escritos)
- Low: escena en una subcarpeta llamada `Personajes/` dentro de `Manuscrito/`: `projectOf` toma la carpeta más profunda y no recuenta.
- Low: "1.000" cuenta como 2 palabras.
- Checks manuales de `tests/obsidian.md` § #25 (R5): no ejecutados, no hay Obsidian en esta máquina.

## Commands
- `npm test`: 294/296; los 2 fallos son de `staging` (`npm-test.log`). En la rama antes de fusionar: 255/255.
- `npm run build`: tsc + esbuild limpio (`npm-build.log`)
