# QA v2 · issue #25 · writing: metas y estadísticas

Head probado: `a5aabfd` (rebuild 1: R1 y R2) más el commit de tests de QA v2. Base `staging` (`4d31d31`) se fusiona sin conflictos (`git merge-tree`).
ACs sin UI propia: el aviso es un `Notice` de Obsidian; se prueba el texto exacto con el comando real de `src/main.ts` y un Obsidian simulado. Sin capturas.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 palabras totales del manuscrito | `tests/stats.test.mjs:21` · `tests/stats-runtime.test.mjs:105` aviso "Manuscrito: 5 palabras", ignora `Personajes/` y otro proyecto | ✅ |
| AC2 meta diaria configurable y progreso del día | `tests/stats.test.mjs:32` · `tests/stats-runtime.test.mjs:114` meta 0 recargada de data.json, "sin meta diaria" | ✅ |
| AC3 racha calculada en local | `tests/stats-edges.test.mjs:14` fin de año y 29 feb · `tests/stats-runtime.test.mjs:124` recuento a los 5 s, solo data.json, sin red | ✅ |
| AC4 test del cálculo de progreso | `tests/stats.test.mjs:32` | ✅ |

## Arreglos del rebuild
- R1 temporizador por proyecto: `tests/stats-runtime.test.mjs` :143. Visto en rojo con la mutación "un solo temporizador compartido" y restaurado.
- R2 nota fuera de proyecto: `tests/stats-runtime.test.mjs` :159. Visto en rojo quitando la guarda de `src/main.ts:636` y restaurado.

## Test gaps
- Escrito: `onunload` cancela los recuentos pendientes de todos los proyectos y vacía el Map. Visto en rojo con `onunload` sin el bucle de `clearTimeout`.
- No escrito (Low): con un proyecto cuya carpeta `Manuscrito/` aún no tiene escenas, **Progreso de escritura** avisa «Abre una nota del proyecto.» en vez de 0 palabras (`src/main.ts:636`).
- No escritos (Low, nits del Reviewer): R3 parseo de **Meta diaria** (`src/settings.ts:88`) y R4 borrar o mover una escena no recuenta (`src/main.ts:79`).
- Checks manuales de `tests/obsidian.md` § #25 (R5): no ejecutados, no hay Obsidian en esta máquina.

## Commands
- `npm test`: 251/251 pass (`npm-test.log`)
- `npm run build`: tsc + esbuild limpio (`npm-build.log`)
