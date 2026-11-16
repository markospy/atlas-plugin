# QA #76 · v1 · base `774c0f2`

Comando: `npm test` (log: `npm-test.log`) · `tsc -noEmit -skipLibCheck` limpio · `npm run build` limpio.

| AC | Resultado | Prueba |
|---|---|---|
| AC1 flujo sin duplicar | ❌ | una línea: ✅ `tests/places-approval.test.mjs:32` · varias líneas con `]` en columna 0: ❌ `tests/places-approval.test.mjs:84` |
| AC2 `nombre: Torre: alta` | ✅ | `tests/places-approval.test.mjs:56` · también con lista en bloque ya escrita (sonda) |
| AC3 ficha falla, `_Memoria/` intacta | ✅ | `tests/places-approval.test.mjs:66`, `:75` · dos fichas, la segunda falla: memoria intacta (sonda) |
| AC4 un test por caso | ✅ | los tres casos tienen test |

## Fallo

`addPlaceStates` (`src/places.ts:80`) usa `frontmatterEnd` (`src/frontmatter.ts:39`), que no acepta una línea `]` en la columna 0. Devuelve -1 y el escritor antepone otro frontmatter: `nombre`, `viajes` y el `estados` original pasan al cuerpo. `parsePlace` sí lee ese frontmatter (usa `frontmatterBody`).

Entrada:

```
---
nombre: Torre
estados: [
  {capitulo: "[[Cap 01]]", descripcion: intacta}
]
viajes: []
---
```

Salida actual: `---\nestados:\n  - capitulo: "[[Cap 03]]"\n    descripcion: en ruinas\n---\n---\nnombre: Torre\n...`

Arreglado: un solo frontmatter, `nombre` = Torre, dos estados.

## Sondas que pasaron (no añadidas)

CRLF con flujo · sin clave `estados` · sin frontmatter · descripción con `:` y `"` · dos estados del mismo lugar en una aprobación · flujo ilegible lanza error.
