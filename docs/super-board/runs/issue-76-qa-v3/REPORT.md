# QA #76 · v3 · base `a57c69f`

Comando: `npm test` (396/396, extracto en `npm-test.log`) · `npm run build` (tsc + esbuild) limpio.

| AC | Resultado | Prueba |
|---|---|---|
| AC1 flujo sin duplicar, `parsePlace` lo lee | ✅ | una línea `tests/places-approval.test.mjs:32` · varias líneas con `]` en columna 0 `:84` · CRLF `:98` · descripción de varias líneas (R1) `:122` · comillas, `\`, `#`, `:` `:151` · `]` dentro de comillas + comentario final `:164` |
| AC2 `nombre: Torre: alta` | ✅ | `tests/places-approval.test.mjs:56` |
| AC3 ficha falla, `_Memoria/` intacta y error visible | ✅ | `tests/places-approval.test.mjs:66` (fallo de escritura), `:75` (ficha que no admite el estado) · el error sale como rechazo de `writeApproved` |
| AC4 un test por caso | ✅ | `:32`, `:56`, `:66` |

Hallazgos del reviewer re-comprobados: R1 `:122` ✅ · R2 flujo con elementos que no son mapas lanza sin escribir `:134` ✅ · R3 `estados: # comentario` `:141` ✅.

## Tests añadidos en v3

- `:151` descripción con comillas dobles, barra invertida, `#` y `:`: se lee igual y la segunda aprobación no cambia nada.
- `:164` flujo con `]` dentro de un valor entre comillas y `# nota` al final: pasa a bloque, un solo frontmatter, el resto igual.

## Sondas que pasaron (no añadidas)

tabulador y `\r\n` dentro de la descripción · `estados: ~` · `estados: [ ]` · flujo sin cerrar (lanza «no se puede leer») · `estados: hola` (lanza) · nota sin frontmatter · `estados` anidado bajo otra clave se ignora · lista en bloque seguida de `# comentario` en columna 0.

## Huecos (no escritos)

- Medio: con dos fichas en una aprobación, si falla la escritura de la segunda, la primera ya quedó escrita (`_Memoria/` sí queda intacta, como pide AC3).
- Medio: un estado que el escritor de 465c5a3 (en `staging`) ya guardó como `descripcion: |-` se lee como `"|-"`; aprobarlo otra vez lo duplica. `parsePlace` no lee escalares de bloque (fuera de los AC; candidato a ticket aparte).
- Bajo: una descripción con U+2028 o U+2029 se corta al leer (`mapList` usa `.` en `src/frontmatter.ts:96`) y se duplica al aprobar otra vez.
