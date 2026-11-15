# QA #16 · v1 · constructor de contexto de escena

Probado contra `ebe10fc` (rama `issue-16-scene-context-builder`). Sin interfaz: no hay capturas, la evidencia son los tests.

| AC | Resultado | Prueba |
|---|---|---|
| 1. Secciones nombradas documentadas | ✅ | `tests/context.test.mjs:101` orden de las 7 · `:111` `:119` `:134` contenido · `:230` skills de capítulo · `:240` alias sin pov · `:266` estado de lugar en N |
| 2. Presupuesto máximo | ✅ (caracteres) | `:145` · `:182` límite exacto, +1 y −1 · `:196` prioridad · `:208` corte por el final / principio · `:221` presupuesto 1, 0, −5 |
| 3. Omite vacías sin fallar | ✅ | `:159` · `:248` espacios, solo frontmatter, CRLF |
| 4. Fixture de proyecto mínimo | ✅ | fixture `:11–95` |

## Test-gap check

- Huecos High escritos: límites del presupuesto, prioridad, corte, skills de `capítulo`, alias, secciones de solo espacios, estado de lugar.
- Cada test nuevo visto en rojo con un mutante en `src/context.ts` (`<=`→`<`, `KEEP_TAIL` vacío, `left > 1`→`> 0`, skill de capítulo siempre, sin alias, sin `trim`, prioridad cambiada, sin normalizar CRLF, sin estados de lugar); el mutante no llegó a commit.

## Huecos no escritos

- Medio: el presupuesto cuenta caracteres, no tokens; el AC acepta cualquiera de los dos.
- Bajo: el corte puede partir un par sustituto (emoji) en dos; testigo `escena: "😀😀"`, `presupuesto: 2`.
- Bajo: `presupuesto: NaN` omite todo sin fallar; no está fijado por test.

## Comandos

- `npm test` → 135/135 (`npm-test.log`)
- `npx tsc -noEmit -skipLibCheck` → limpio (`tsc.log`)
