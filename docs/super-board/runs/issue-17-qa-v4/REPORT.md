# QA v4 · issue #17 · PR #64 @ `77ed7bd`

| AC | Resultado | Prueba |
|---|---|---|
| AC1 lista de hallazgos con tipo y ancla | ✅ | `tests/review.test.mjs:50`, `tests/review-readonly.test.mjs:44` (CRLF), en ejecución `tests/review-runtime.test.mjs:139` (modal con «Línea 5 · estilo») |
| AC2 no modifica el manuscrito | ✅ | en ejecución `tests/review-runtime.test.mjs:139` y `:151`: el comando real y el modal solo llaman `getActiveFile`, `getMarkdownFiles`, `cachedRead`, `getValue` y `setCursor` · `tests/review.test.mjs:108` |
| AC3 sin proveedor, mensaje claro | ✅ | `tests/review.test.mjs:118`, `:130`, en ejecución `tests/review-runtime.test.mjs:160` (un solo aviso, sin red) |
| AC4 test con proveedor mock | ✅ | `tests/review.test.mjs:69` (`ollamaProvider` en `/api/generate`), `tests/review-runtime.test.mjs` (`requestUrl` stub) |
| R3 fusión con `staging` | ✅ | `origin/staging` (`f15e433`) es ancestro de `77ed7bd`; `git merge-tree` limpio; `tsc` y `npm run build` limpios |
| R4 un solo aviso sin proveedor | ✅ | `tests/review-runtime.test.mjs:160` |
| R6 AC2 en ejecución, no con regex | ✅ | `tests/review-runtime.test.mjs` nuevo; mutaciones: un `vault.modify` en `reviewWithAi` y quitar `inProject` lo ponen rojo |
| R10 escena recortada | ✅ | `tests/review.test.mjs:84` |
| R12 `[{` sin cerrar | ✅ | `tests/review.test.mjs:189` |
| R13 `[null, {...}]` | ✅ | `tests/review.test.mjs:196` |

- `npm test`: 237/237 (`npm-test.log`)
- `tsc -noEmit -skipLibCheck`: limpio (`tsc.log`) · `npm run build`: limpio (`build.log`)
- Sin capturas: no hay Obsidian ni display aquí; check manual en `tests/obsidian.md` § #17

## Test gaps (not written)
- Low · el aviso «Abre una escena de un capítulo (Cap NN).» con una nota fuera de `Cap NN` no tiene test.
- Low · R9 (`.catch` del comando en `src/main.ts:224`) no tiene test: el rechazo se prueba solo leyendo el código.
