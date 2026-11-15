# QA #11 · v1 · contra eea5318

Comando: `npm test` (127/127 pasan, 6/6 en `tests/foreshadow.test.mjs`) y `npm run build` (tsc + esbuild limpios). Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 crear pista con los tres estados | `tests/foreshadow.test.mjs` "la plantilla crea una pista sembrada…" | ✅ plantilla `tipo: pista`, `estado: sembrado`, los tres estados se leen; carpeta `Trama/` del proyecto. El comando en Obsidian no se ejecuta en node (check manual en `tests/obsidian.md` § #11) |
| AC2 tablero solo con pistas no resueltas | "el tablero lista solo pistas no resueltas…", "qa: pista sin estado o con estado entre comillas; proyecto raíz" | ✅ excluye `resuelto` (también entre comillas), otro proyecto, notas `tipo: trama` y `Trama/` anidada en `Manuscrito/`; pista sin estado sale abierta |
| AC3 aviso de objeto con peso narrativo que no vuelve | "objeto con peso narrativo…", "qa: aviso de objeto con cero escenas…" | ✅ 0 y 1 escena avisan, 2 no; alias cuenta; el manuscrito de otro proyecto no cuenta; objeto sin `funcion` no avisa |
| AC4 test de transición de estados | "transición de estados: solo hacia delante…" | ✅ `nextState` y `canMove` (adelante, repetir reforzado, resuelto fijo, estado desconocido) |

Mutantes probados (rojo y restaurado, no commiteados): prefijo `Trama/` quitado en `openClues`; `escenas.length < 2` → `=== 1` en `forgottenObjects`.

Sin capturas: es un plugin de Obsidian sin runtime en este entorno; la evidencia es el log de tests.

## Test gaps (not written)
- Medium: `newClue`, `advanceClue` y `ForeshadowView` en `src/main.ts` / `src/foreshadow-view.ts` no tienen runtime de Obsidian en node; cubiertos por el check manual.
- Low: `canMove` solo lo usan los tests; **Avanzar pista** desde `reforzado` va a `resuelto` y no permite reforzar de nuevo ni anota el capítulo en `reforzado`.
- Low: `estado: Resuelto` (mayúscula) cuenta como abierta.
