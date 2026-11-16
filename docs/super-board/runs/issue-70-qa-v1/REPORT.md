# QA #70 v1 · head `a410403`

Resultado: ❌ falla (1 hueco High de pérdida de datos).

## AC
| AC | Resultado | Prueba |
|---|---|---|
| AC1 cierre `--- ` con espacios | ✅ | `tests/extract-qa.test.mjs:128`, `tests/frontmatter-end.test.mjs:19`; sonda CRLF + `---  ` y `---\t` ✅ |
| AC2 `hechos: [{...}]` en línea | ✅ | `tests/extract-qa.test.mjs:138`, `:147`, `:161`; sonda con `[x, y]` anidado y `"a, [b]"` ✅ |
| AC3 rondas anteriores | ✅ | `tests/extract-qa.test.mjs:110-123` y resto del archivo en verde |
| AC4 `npm test` entero | ❌ | 372/372 en `a410403`; 372/373 con el test nuevo de QA (abajo) |

Base `staging`: `extract-qa.test.mjs:128` y `:138` en rojo, 7 tests de `decisions-runtime` en rojo; en la rama, verdes.

## Hueco High (necesita código de app)
- Testigo: `---\ntipo: memoria\ncapitulo: 3\nhechos: [\n  {id: anillo, texto: El anillo}\n]\n---\nCuerpo\n`
- Esperado: un solo frontmatter, `capitulo` 3, hechos `anillo, carta`.
- Real: `frontmatterEnd` (`src/frontmatter.ts:36-42`) rechaza la línea `]` en columna 0, `appendToList` (`src/extract.ts:208-209`) antepone otro frontmatter; `tipo`, `capitulo` y `anillo` pasan al cuerpo.
- Ya ocurría en `staging`; es el mismo síntoma del ticket (segundo frontmatter que oculta hechos).
- Test: `tests/extract-qa.test.mjs:178` (rojo).

## Huecos sin escribir
- Medium: `hechos: [{id: anillo, texto: x}] # a mano` lanza error (no pierde datos), pero `parseMemory` lee 0 hechos.
- Low: `src/vault.ts:56`, `src/style.ts:90`, `src/linter.ts:192`, `src/cowrite.ts:141` siguen con su propio corte de `---` (fuera del alcance de memoria).

Local tests: npm test
