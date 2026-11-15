# QA #22 · v1 · registro de decisiones

Head probado: `884077a` (rama `issue-22-decisions-forward-change-log`) + test de QA.

| AC | Unit | Componente | e2e |
|---|---|---|---|
| AC1 registrar decisión con corte y valor antiguo/nuevo | `tests/decisions.test.mjs:21` · validación `:48` | none (modal sin harness) | n/a: checklist manual `tests/obsidian.md` § #22 |
| AC2 lista capítulos < corte con el valor antiguo | `tests/decisions.test.mjs:23` · borde cap. 6 / corte 7 `:71` | none | n/a: checklist manual |
| AC3 marcar alineado lo quita | `tests/decisions.test.mjs:30` | none | n/a: checklist manual |
| AC4 test con rename de lugar | `tests/decisions.test.mjs:20` | — | — |

## Bordes
- Corte: cap. 7 fuera (`:13`), cap. 6 dentro (`:71`), escena sin número fuera (`:71`).
- Mayúsculas: `Posada del Ciervo`, `POSADA DEL CIERVO` coinciden.
- Palabras sueltas ("posada … ciervo") no coinciden (cap. 5).
- Otro proyecto y notas fuera de `Manuscrito/` no cuentan.
- Varias escenas del mismo capítulo: orden numérico (Escena 2 antes que Escena 10).

## Test de los tests
Test nuevo visto en rojo con dos mutantes, luego restaurado:
- quitar el orden de `escenas`
- corte `>= desde - 1`

## Huecos de test (no escritos)
- Medium: la persistencia en `.atlas/decisiones.json` (`src/main.ts` `showDecisions`/`writeJson`) no tiene test automático; solo checklist manual.
- Medium: el modal (`src/decisions-modal.ts`) no tiene test de componente; con un corte vacío, `Number("")` da 0 y la validación lo rechaza.
- Low: un valor antiguo muy corto puede listar capítulos de más (Risk ya lo dice).

## Suite completa
324 tests: 322 pasan, 2 fallan (`tests/extract-qa.test.mjs`). Los mismos 2 fallan en `origin/staging` `1784feb`; este cambio no los toca.

Sin capturas: plugin de Obsidian sin UI renderizable en headless; evidencia = logs de esta carpeta.
