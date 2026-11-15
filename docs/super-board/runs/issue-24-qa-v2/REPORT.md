# QA v2 · issue #24 · sidebar: vistazo de entidad con estado del capítulo

Head probado: `63ce892` (rebuild R1 R2 R4) más el commit de tests de QA v2. Sin capturas: el panel solo corre dentro de Obsidian y aquí no hay Obsidian headless.

| AC | Prueba unitaria | Componente / e2e | Resultado |
|---|---|---|---|
| AC1 mención conocida → panel muestra la entidad | `tests/peek.test.mjs:58` (nombre, alias, borde final), `:67` (enlace `[[…]]`, varias palabras), `:98` (gana la más larga), `:107` (palabra completa), `:152` (signos de regex, segunda aparición) | n/a: solo Obsidian; render en `src/peek-view.ts:74-93` | ✅ |
| AC2 estado/posesión/relación del capítulo | `tests/peek.test.mjs:73` (relación cap 5 vs 11), `:86` (poseedor y lugar), `:115` (sin capítulo), `:121` (ficha sin `nombre`, R2), `:138` y `:164` (`chapterOf`, R4) | n/a: solo Obsidian | ✅ |
| AC3 sin match → aviso sin error | `tests/peek.test.mjs:93` (`{ ok: false }`, sin lanzar) | mensaje en `src/peek-view.ts:71` | ✅ |
| AC4 test del resolver nombre→entidad→estado | `tests/peek.test.mjs:58-179` | — | ✅ |

## Rebuild verificado
- R1: `modify` solo vacía la caché si el archivo es ficha del proyecto (`src/peek-view.ts:43-49`, `isSheetPath` en `tests/peek.test.mjs:144`).
- R2: ficha sin `nombre` toma el título de la nota y muestra estado (`tests/peek.test.mjs:121`).
- R4: `chapterOf` puro y probado (`tests/peek.test.mjs:138`, `:164`).
- R5 (qa): citas del bloque `ac` corregidas a las líneas reales.

## Test gaps
- Escritos por QA v2: nombre con `.`/`()` y alias vacíos, cursor sobre la segunda aparición, `chapterOf` en la raíz y formatos `Cap.7` / `cap 12 - final`, escenas de `Manuscrito/` con `tipo:` no entran como fichas.
- No escritos (Medium): evento `modify` de Obsidian y debounce sin test de componente; requiere runtime de Obsidian.
- No escritos (Low): R3 sigue abierto, el estado del lugar muestra el enlace crudo `(desde [[Cap 12]])` (`src/peek.ts:60`); cosmético.

## Comandos
- `npm test`: 251/251 pass
- `npm run build`: tsc + esbuild limpio
- Merge con `origin/staging` (`4d31d31`): sin conflictos (`git merge-tree`)
