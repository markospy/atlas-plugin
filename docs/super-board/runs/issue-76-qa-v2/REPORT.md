# QA #76 · v2 · base `738f920`

Comando: `npm test` (391/391, extracto en `npm-test.log`) · `tsc -noEmit -skipLibCheck` limpio · `npm run build` limpio.

| AC | Resultado | Prueba |
|---|---|---|
| AC1 flujo sin duplicar, `parsePlace` lo lee | ✅ | una línea `tests/places-approval.test.mjs:32` · varias líneas con `]` en columna 0 `:84` (fallo de v1, ya arreglado) · varias líneas con CRLF `:98` |
| AC2 `nombre: Torre: alta` | ✅ | `tests/places-approval.test.mjs:56` · también sin clave `estados` y con CRLF (sondas) |
| AC3 ficha falla, `_Memoria/` intacta y error visible | ✅ | `tests/places-approval.test.mjs:66`, `:75` · el error sale como rechazo de `writeApproved` |
| AC4 un test por caso | ✅ | `:32`, `:56`, `:66` |

## Tests añadidos en v2

- `:98` flujo de varias líneas con CRLF: pasa a bloque, solo CRLF, segunda aprobación no cambia nada.
- `:113` lista en bloque sin sangría: el estado nuevo va a la misma sangría, antes de `viajes:`.

## Sondas que pasaron (no añadidas)

`]` dentro de una descripción entre comillas · `estados: [] # comentario` · frontmatter vacío (`---\n---`) · flujo de varias líneas con varios elementos repartidos en líneas.

## Huecos (no escritos)

- Medio: con dos fichas en una aprobación, si falla la escritura de la segunda, la primera ya quedó escrita (`_Memoria/` sí queda intacta, como pide AC3). Repetir la aprobación no duplica el estado.
- Bajo: `estados: # comentario` sin valor se trata como no-lista y lanza error.
