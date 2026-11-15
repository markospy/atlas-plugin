# QA #23 · v1 · head `197d056`

| AC | Resultado | Prueba |
|---|---|---|
| AC1 Escenas pueden declarar marca temporal | ✅ | `tests/chronology.test.mjs:20` · `tests/chronology-qa.test.mjs:6` (CRLF, alias, lista de bloque, `dia`/`lugar` vacíos) |
| AC2 Lugares/rutas declaran duración mínima | ✅ | `tests/chronology.test.mjs:40` · `tests/chronology-qa.test.mjs:18` (CRLF, sin comillas, orden de campos, `dias` no numérico) |
| AC3 El chequeo lista pares imposibles | ✅ | `tests/chronology.test.mjs:49`, `:63`, `:81`, `:92` · `tests/chronology-qa.test.mjs:26` (mismo día, varios personajes) |
| AC4 Test con viaje demasiado corto | ✅ | `tests/chronology.test.mjs:49` |

- `npm test`: 108/108 (`npm-test.log`)
- `npm run build`: limpio (`build.log`)

## Huecos de test (no escritos)
- Medio: un enlace con ruta (`[[Lugares/Puerto]]`) no coincide con el `nombre` de la ficha y el par no se avisa; Obsidian solo escribe la ruta cuando el nombre es ambiguo.
- Medio: el comando **Revisar cronología** (`src/main.ts:115`) no se probó dentro de Obsidian; no hay harness de Obsidian en el repo.
- Bajo: `viajes:` con espacio final o sangría distinta de 2 espacios no se lee.
