# QA #16 · v2 · constructor de contexto de escena

Probado contra `0bd91b0` (rama `issue-16-scene-context-builder`, ronda 2 del builder). Sin interfaz: no hay capturas, la evidencia son los tests.

| AC | Resultado | Prueba |
|---|---|---|
| 1. Secciones nombradas documentadas | ✅ | `tests/context.test.mjs:101` orden de las 7 · `:111` `:119` `:134` `:230` `:240` `:266` contenido · `:281` skills de alcance escena fuera |
| 2. Presupuesto máximo | ✅ (caracteres) | `:145` · `:182` límite exacto ±1 · `:196` prioridad · `:208` corte · `:221` 1, 0, −5 · `:305` NaN e Infinity · `:288` el corte no parte emojis |
| 3. Omite vacías sin fallar | ✅ | `:159` · `:248` espacios, solo frontmatter, CRLF |
| 4. Fixture de proyecto mínimo | ✅ | fixture `:11–95` |

## Hallazgos del reviewer (ronda 1)

| ID | Estado | Prueba |
|---|---|---|
| R1 corte `---` inicial pierde texto | ✅ arreglado | `:273` · `:315` frontmatter real seguido de cortes, y frontmatter sin cierre |
| R2 helper de cuerpo de nota | ✅ arreglado | `noteBody` en `src/frontmatter.ts`, usado por `src/context.ts:59` |
| R3 skills `escena` | ✅ arreglado | `:281` |
| R4 corte parte emoji | ✅ arreglado | `:288` |
| R5 `presupuesto: NaN` sin test (qa) | ✅ fijado | `:305`: NaN se trata como 0, nada entra, sin fallar |

## Test-gap check

- Huecos High escritos: `presupuesto` NaN / Infinity; frontmatter real seguido de cortes `---`; frontmatter sin cierre.
- Cada test nuevo visto en rojo con un mutante (NaN → entra todo; `indexOf` → `lastIndexOf` del cierre; sin cierre → cuerpo vacío); el mutante no llegó a commit.

## Huecos no escritos

- Medio: el presupuesto cuenta caracteres, no tokens; el AC acepta cualquiera de los dos.
- Bajo: una línea de diálogo tipo `Elena: …` justo tras un corte `---` inicial se lee como frontmatter; misma regla que `src/linter.ts`.

## Comandos

- `npm test` → 140/140 (`npm-test.log`)
- `npx tsc -noEmit -skipLibCheck` → limpio (`tsc.log`)
