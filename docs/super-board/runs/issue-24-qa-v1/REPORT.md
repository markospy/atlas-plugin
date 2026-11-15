# QA v1 · issue #24 · sidebar: vistazo de entidad con estado del capítulo

Head probado: `be97b1f` más el commit de tests de QA. Sin capturas: el panel solo corre dentro de Obsidian y aquí no hay Obsidian headless.

| AC | Prueba unitaria | Componente / e2e | Resultado |
|---|---|---|---|
| AC1 mención conocida → panel muestra la entidad | `tests/peek.test.mjs:58` (nombre, alias, borde final), `:67` (enlace `[[…]]`, varias palabras, mayúsculas), `:98` (gana la más larga), `:107` (palabra completa, borde inicial) | n/a: solo Obsidian; render en `src/peek-view.ts:74-78` | ✅ |
| AC2 estado/posesión/relación del capítulo | `tests/peek.test.mjs:73` (relación cap 5 vs 11), `:86` (poseedor cap 2 vs 4, lugar cap 1 vs 12), `:115` (sin capítulo → sin estado) | n/a: solo Obsidian | ✅ |
| AC3 sin match → aviso sin error | `tests/peek.test.mjs:93` (`{ ok: false }`, sin lanzar, índice vacío) | mensaje en `src/peek-view.ts:70` | ✅ |
| AC4 test del resolver nombre→entidad→estado | `tests/peek.test.mjs:58-120` | — | ✅ |

## Test gaps
- Escritos por QA: la coincidencia más larga gana aunque la corta venga después (mutante sin el guard `clean.length <= bestLength` ahora falla), columna justo antes de la mención no cuenta (mutante `start - 1 <= ch` ahora falla), `Elenas` no casa con `Elena`, `chapter = null` da estado vacío.
- No escritos (Medium): capa de vista sin test de componente — capítulo desde la carpeta padre (`src/peek-view.ts:66`), debounce y vaciado de caché en cambios de bóveda. Requiere runtime de Obsidian.
- No escritos (Low): el estado del lugar muestra el enlace crudo, `(desde [[Cap 12]])`; cosmético.

## Comandos
- `npm test`: 245/245 pass (`npm-test.log`)
- `npm run build`: tsc + esbuild limpio
- Merge con `origin/staging` (`8c58ab1`): sin conflictos (`git merge-tree`)
