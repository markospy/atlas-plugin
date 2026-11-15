# QA v1 · issue #21 · chapters: marcar desactualizados y reanalizar en orden

Head probado: `c52750a` más el commit de tests de QA. Lógica pura en `src/stale.ts`; la lista es un `Modal` de Obsidian. Sin capturas: no hay Obsidian que arrancar aquí (headless); la lista se cubre con tests de la lógica y con la checklist manual de `tests/obsidian.md` § #21.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 editar hechos del cap. A marca stale a quien los usa | `tests/stale.test.mjs:28`, `:39`, `:56` · `tests/stale-qa.test.mjs:16` (solo cambia `verdad`), `:23` (introducido antes), `:32` (reintroducido entre medias), `:56` (id renombrado), `:66` (el propio capítulo no) | ✅ |
| AC2 la lista muestra motivo por capítulo | `tests/stale.test.mjs:28` (motivo literal) · `tests/stale-qa.test.mjs:42` (un motivo por hecho roto) · render del modal: `src/stale-modal.ts:33` lista `motivos` por capítulo (sin test: API de Obsidian) | ✅ |
| AC3 reanálisis en orden, limpia solo al confirmar | `tests/stale.test.mjs:64` · `tests/stale-qa.test.mjs:71` (propagar otra vez no limpia nada) | ✅ |
| AC4 test carta eliminada → 9 y 14 stale | `tests/stale.test.mjs:28` | ✅ |

## Huecos de test
- Escritos (`tests/stale-qa.test.mjs`): cambio solo de `verdad`, hecho ya introducido en un capítulo anterior, cambio con reintroducción, dos motivos en un capítulo, id renombrado, uso en el propio capítulo editado, propagar sin nuevos no limpia.
- Mutaciones: quitar la comparación de `verdad`, quitar la cobertura de `eliminado`, quitar la de `cambiado`, `> edited` → `>= edited`, `mergeStale` que olvida la lista actual. Cada una pone rojo un test nuevo; el código quedó restaurado.
- Sin escribir (Medium): `propagateChanges`/`openStale` en `src/main.ts:622` no tienen test (Obsidian). La primera ejecución guarda la base de todas las memorias; si una memoria no del capítulo activo se editó antes de propagar, su cambio queda en la base sin marcar nada.
- Sin escribir (Low): «Abrir para corregir» busca `Manuscrito/` por número de capítulo; con dos libros en el mismo proyecto puede abrir el capítulo equivocado.

## Comandos
- `npm test`: 316/318 (`npm-test.log`). Los 2 fallos están en `tests/extract-qa.test.mjs`, ya fallan en `staging` y los sigue el bug #70; esta PR no toca esos archivos.
- `node --experimental-strip-types --test tests/stale.test.mjs tests/stale-qa.test.mjs`: 13/13 (`stale-tests.log`)
- `npm run build`: tsc + esbuild limpio (`build.log`)
