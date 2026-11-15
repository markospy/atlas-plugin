# QA #39 · v1 · contra `d5e97be`

Resultado: ✅ pasa (3/3 AC). Sin UI: no hay capturas, la evidencia son los logs.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 un solo módulo de helpers | `tests/sheets.test.mjs:82` · `duplicates.txt` | ✅ characters, places, memory y objects importan de `src/frontmatter.ts`; ninguna copia local |
| AC2 CRLF = LF | `tests/sheets.test.mjs:69` · `tests/sheets-qa.test.mjs:35`, `:46` | ✅ las 4 fichas y las 4 plantillas dan lo mismo |
| AC3 `hechos: ` y lista sin sangría | `tests/sheets.test.mjs:73` · `tests/sheets-qa.test.mjs:11` | ✅ mismos hechos; dos listas sin sangría seguidas no se mezclan |

## Comandos
- `npm test` → 200/200 (`npm-test.log`)
- `npx tsc -noEmit -skipLibCheck` → OK (`tsc.log`)

## Mutaciones (no commiteadas)
- quitar el corte de lista en `mapList` → `sheets-qa.test.mjs:11` rojo
- volver a `line === \`${key}:\`` → `sheets-qa.test.mjs:35` rojo

## Huecos (no escritos)
- Medio: `src/style.ts:86-102` mantiene su copia de `frontmatterBody` / `scalar` / `unquote` (el builder lo excluye: su `unquote` acepta comentarios `#`). El AC nombra solo personaje, lugar y memoria; queda a criterio del reviewer.
- Bajo: claves con tilde o guion (`descripción:`) no casan con `\w` en `mapList`; igual que antes del cambio.
