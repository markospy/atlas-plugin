# QA v3 · issue #24 · sidebar: vistazo de entidad con estado del capítulo

Head probado: `812c29e` (rebuild R3 R6 R7 R8) más el commit de tests de QA v3. Sin capturas: el panel solo corre dentro de Obsidian y aquí no hay Obsidian headless.

| AC | Prueba unitaria | Componente / e2e | Resultado |
|---|---|---|---|
| AC1 mención conocida → panel muestra la entidad | `tests/peek.test.mjs:58`, `:67`, `:98`, `:107`, `:152` | n/a: solo Obsidian; render en `src/peek-view.ts:74-93` | ✅ |
| AC2 estado/posesión/relación del capítulo | `tests/peek.test.mjs:73`, `:86`, `:115`, `:121`, `:138`, `:164`, `:181` (R6/R7), `:197` (enlace con `#` y al alias) | n/a: solo Obsidian | ✅ |
| AC3 sin match → aviso sin error | `tests/peek.test.mjs:93` | mensaje en `src/peek-view.ts:71` | ✅ |
| AC4 test del resolver nombre→entidad→estado | `tests/peek.test.mjs:58-215` | — | ✅ |

## Rebuild verificado
- R3: estado del lugar sin corchetes, `(desde Cap 12)` (`src/peek.ts:63`, `tests/peek.test.mjs:89`, `:135`).
- R6: el estado casa enlaces con `nombre`, nombre de archivo o alias (`src/peek.ts:56-58`, `tests/peek.test.mjs:181`).
- R7: fixture con `nombre` distinto del archivo (`tests/peek.test.mjs:181`).
- R8: `reviewWithAi` usa `chapterOf` (`src/main.ts:523`).
- R9 (qa): quitados los `*.log` de `issue-24-qa-v1/` y `issue-24-qa-v2/`; la evidencia queda en los `REPORT.md`.

## Test gaps
- Escrito por QA v3: enlace con encabezado `[[Ana#Infancia]]` y enlace al alias `[[la hermana]]` casan con la ficha.
- No escritos (Medium): evento `modify` de Obsidian y debounce sin test de componente; requiere runtime de Obsidian.

## Comandos
- `npm test`: 253/253 pass
- `npm run build`: tsc + esbuild limpio
- Merge con `origin/staging` (`35242d7`): sin conflictos (`git merge-tree`)
