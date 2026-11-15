# QA #17 · v2 · contra b5ede53

Comando: `npm test` (212/212 pasan) · `tsc -noEmit` limpio · build de producción ok. Log: `npm-test.log`.
Ronda 2: el reviewer devolvió R1 y R2; los dos hilos `[builder]` están resueltos y no hay hilos `[qa]`.

| AC | Test | Resultado |
|---|---|---|
| AC1 lista de hallazgos con tipo y ancla al texto | `tests/review.test.mjs` "con proveedor mock…", "encuentra el JSON aunque haya corchetes…" (R1); `tests/review-readonly.test.mjs` "ancla citas en una escena sin frontmatter" | ✅ tipo + línea/columna. R1: `Mira [1]: [...]`, `[...] — ver [nota]` y prosa alrededor del bloque ```json dan 1 hallazgo; `Solo [1] y [2]` da `null`. Probado también: corchetes dentro de `mensaje` y `[]` como "sin hallazgos" |
| AC2 no modifica archivos del manuscrito | `tests/review-readonly.test.mjs` "Revisar escena con IA no escribe…", `tests/review.test.mjs` "no modifica el manuscrito…" | ✅ solo `cachedRead` y `setCursor` |
| AC3 sin proveedor, mensaje claro (no crash) | `tests/review.test.mjs` "sin proveedor configurado…", "host no permitido, red caída…" | ✅ |
| AC4 test con proveedor mock | `tests/review.test.mjs` `mock()` | ✅ |
| R2 solo notas del proyecto de la escena | `tests/sheets.test.mjs` "inProject: solo las notas del proyecto…"; `tests/review-readonly.test.mjs` "…solo lee notas del proyecto de la escena" | ✅ `Novela A` no lee `Novela B` ni `Novela AB`; raíz del vault lee todo |

Capturas: no hay Obsidian ni display en este entorno; el modal queda en el check manual de `tests/obsidian.md` § #17.

## Test gaps (not written)
- Medium: `firstArray` (`src/review.ts:122`) prueba cada par `[`…`]` con `JSON.parse`; una respuesta sin JSON válido con muchos corchetes congela la UI: `"Ver [1] ".repeat(500)` (4 000 caracteres) tarda 1,4 s y `repeat(1000)` 5,0 s antes de dar `null`. Un tope de intentos o de longitud lo evita.
- Medium: el test de R2 en `review-readonly.test.mjs` solo busca el texto `inProject(` en `reviewWithAi`; no ejecuta el comando con dos proyectos (necesita Obsidian).
- Medium: el clic del modal (`setCursor`) solo se cubre con el check manual.
- Low: el aviso "Revisando la escena con IA…" sale antes del mensaje de sin proveedor (`src/main.ts:507`).
- Low: una cita repetida se ancla a su primera aparición.
