# QA #22 · v2 · registro de decisiones (rebuild por R1)

Head probado: `be3033d` (rama `issue-22-decisions-forward-change-log`) + test de QA v2.

R1 del Reviewer: el guardado en `.atlas/decisiones.json` y el modal no tenían test automático. Ahora sí, con el arnés de `tests/backup-runtime.test.mjs` (esbuild del plugin real, `obsidian` falso, adaptador en memoria).

| AC | Unit | Runtime (plugin real + modal) | e2e |
|---|---|---|---|
| AC1 registrar decisión con corte y valor antiguo/nuevo | `tests/decisions.test.mjs:21` · validación `:48` | guarda `d1` bajo `Novela` en `.atlas/decisiones.json` `tests/decisions-runtime.test.mjs:183` · avisos sin escribir `:233` | n/a: Obsidian sin UI headless |
| AC2 lista capítulos < corte con el valor antiguo | `tests/decisions.test.mjs:23` · borde `:71` | el modal lista cap. 2 y cap. 4, no cap. 7 ni la otra novela `:183` | n/a |
| AC3 marcar alineado lo quita | `tests/decisions.test.mjs:30` | guarda `alineados: [2]` y quita el cap. 2 `:199` · reabrir muestra lo mismo `:213` | n/a |
| AC4 test con rename de lugar | `tests/decisions.test.mjs:20` | posada del Ciervo → El Reyezuelo desde el cap. 7 `:183` | — |

## Bordes runtime
- Corte 0, corte vacío, valor antiguo solo espacios, valor nuevo vacío: un `Notice` con el mensaje de la validación, sin `.atlas/decisiones.json`.
- Reabrir con un plugin nuevo sobre el mismo almacén (como reiniciar Obsidian): la decisión y el cap. 2 alineado siguen.
- **Abrir** abre la primera escena del capítulo y cierra el modal.

## Test de los tests (`mutants.log`)
Test nuevo visto en rojo con tres mutantes, luego restaurado:
- `change()` no guarda: 3 fallos
- `align` ignora el capítulo: 2 fallos
- el modal se traga el error sin `Notice`: 4 fallos

## Huecos de test (no escritos)
- Low: el render real de Obsidian (estilos, foco) solo en el checklist manual `tests/obsidian.md` § #22.
- Low: un valor antiguo muy corto puede listar capítulos de más (Risk ya lo dice).

## Suite completa
331 tests: 329 pasan, 2 fallan (`tests/extract-qa.test.mjs`). Los mismos 2 fallan en el merge-base `92b00bc` (9 pasan, 2 fallan, worktree aparte); este cambio no los toca. Sobre R2: `1784feb` (QA v1) y `92b00bc` (builder) son ancestros de staging; el merge-base es `92b00bc`.

Build: `npm run build` limpio (`build.log`).

Sin capturas: plugin de Obsidian sin UI renderizable en headless; evidencia = logs de esta carpeta.
