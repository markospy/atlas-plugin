# QA v1 · issue #25 · writing: metas y estadísticas

Head probado: `9efe445` más el commit de tests de QA. Base `staging` (`8c58ab1`) se fusiona sin conflictos (`git merge-tree`).
ACs sin UI propia: el aviso de Obsidian (`Notice`) y el ajuste se prueban con el comando real y un stub de Obsidian, no hay capturas de pantalla.

| AC | Unidad | Runtime (main.ts con stub) | Resultado |
|---|---|---|---|
| AC1 palabras totales del manuscrito | `tests/stats.test.mjs:14`, `:21`, `tests/stats-edges.test.mjs:6` | `tests/stats-runtime.test.mjs:101` aviso "Manuscrito: 5 palabras", ignora `Personajes/` y otro proyecto | ✅ |
| AC2 meta diaria configurable y progreso del día | `tests/stats.test.mjs:32`, `tests/stats-edges.test.mjs:25` | `:101` meta 500 por defecto · `:110` meta 0 recargada de data.json, "sin meta diaria" | ✅ |
| AC3 racha calculada en local | `tests/stats.test.mjs:46`, `tests/stats-edges.test.mjs:14` (fin de año, 29 feb, día sin registro) | `:110` racha 2 desde el registro de ayer · `:120` recuento a los 5 s solo para escenas, guarda en data.json, sin red | ✅ |
| AC4 test del cálculo de progreso | `tests/stats.test.mjs:32` | n/a | ✅ |

Racha probada también con `TZ=Europe/Berlin`, `America/Santiago` y `America/Sao_Paulo` alrededor del cambio de hora: sin saltos de día.

## Test gaps
- Escritos (vistos en rojo con una mutación y restaurados): prefijo `ManuscritoX/`, extensión `.canvas`, `.MD`; racha en fin de año y 29 feb; redondeo 1/3 = 33 %; meta 2.9 → 2; recarga de `escritura` y `metaDiaria` desde data.json; `saveData` sin `escritura`; modify fuera de `Manuscrito/`; reescritura de data.json sin cambio de total.
- No escritos (Medium): un solo temporizador para todos los proyectos; guardar en el proyecto A y luego en B en menos de 5 s descarta el recuento de A hasta el siguiente guardado o comando (`src/main.ts:606`).
- No escritos (Low): el parseo del campo **Meta diaria** (`"abc"` → 0, `"500abc"` → 500) vive dentro del callback de UI (`src/settings.ts:88`); el primer día de uso las palabras del primer guardado no cuentan (documentado en el PR).
- Checks manuales de `tests/obsidian.md` § #25: no ejecutados, no hay Obsidian en esta máquina.

## Commands
- `npm test`: 248/248 pass (`npm-test.log`)
- `npm run build`: tsc + esbuild limpio (`npm-build.log`)
