# QA #76 · v4 · base `38bca1f`

Comando: `npm test` (401/401, extracto en `npm-test.log`) · `npm run build` (tsc + esbuild) limpio.

| AC | Resultado | Prueba |
|---|---|---|
| AC1 flujo sin duplicar, `parsePlace` lo lee | ✅ | `tests/places-approval.test.mjs:32` · varias líneas `:84` · CRLF `:98` · descripción de varias líneas `:122` · comillas `:151` · `]` entre comillas `:164` · R4 comentario `:178` · R5 `\|-` `:186` · QA v4 sin comillas `:224` |
| AC2 `nombre: Torre: alta` | ✅ | `:56`, `:195` · misma ficha en `465c5a3^`: mismo `parsePlace` (solo cambia `"z"` → `z`) |
| AC3 ficha falla, `_Memoria/` intacta y error visible | ✅ | `:66` (fallo de escritura), `:75` (ficha que no admite el estado) |
| AC4 un test por caso | ✅ | `:32`, `:56`, `:66` |

Hilos de PR: no hay hilos `[qa]`; R1–R6 `[builder]` resueltos.

## Test añadido en v4

- `:224` un estado escrito a mano sin comillas (`null`, `0x1F`, `1e3`, `.inf`, `0o17`, `+12`) se lee como texto y aprobarlo otra vez no cambia la ficha. Visto en rojo al quitar `FAILSAFE` de `placeEntries` (`src/places.ts:159`), verde al restaurarlo.

## Sondas que pasaron (no añadidas)

243 combinaciones: fichas en flujo, bloque, `[]`, vacío, sin `estados`, bloque con `|-` + línea en blanco + `# notas`, `[[Cap 01]]` sin comillas × descripciones `null`, `~`, `123`, `yes`, `- x`, `[a]`, `{a: b}`, `a: b`, `#x`, `---`, `...`, `*al`, `&an`, `!tag`, `|`, `> f`, tabulador, emoji, 300 caracteres, U+2028, U+2029, U+0085: idempotente, un solo frontmatter, YAML válido. Tres estados (uno repetido) para la misma ficha en una aprobación: dos añadidos. Flujo con `{` en la columna 0 (YAML inválido): lanza «no se puede leer» sin escribir.

## Huecos (no escritos)

- Medio: con dos fichas en una aprobación, si falla la escritura de la segunda, la primera ya quedó escrita (`_Memoria/` sí queda intacta, como pide AC3).
- Bajo: `placeEntries` separa las entradas con una expresión regular (`src/places.ts:153`); el ticket pide «sin parseo manual», pero AC2 exige leer `nombre: Torre: alta`, que la librería `yaml` rechaza. Decisión para el reviewer.
