# QA #17 · v1 · contra 1923070

Comando: `npm test` (196/196 pasan) · `tsc -noEmit` limpio · build de producción ok. Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 lista de hallazgos con tipo y ancla al texto | `tests/review.test.mjs` "con proveedor mock: hallazgos con tipo y ancla…", "descarta tipos desconocidos…"; `tests/review-readonly.test.mjs` "ancla citas en una escena sin frontmatter" | ✅ tipo + línea/columna desde el inicio de la nota; tipos desconocidos y citas fuera del cuerpo descartados y contados. Modal no ejecutado en Obsidian (check manual en `tests/obsidian.md` § #17) |
| AC2 no modifica archivos del manuscrito | `tests/review.test.mjs` "no modifica el manuscrito…"; `tests/review-readonly.test.mjs` "Revisar escena con IA no escribe…" (nuevo, QA) | ✅ `reviewWithAi` y `ReviewModal` sin ninguna API de escritura de vault/editor; solo `cachedRead` y `setCursor`. Visto en rojo con `vault.modify` en el comando y `replaceRange` en el modal, luego restaurado |
| AC3 sin proveedor, mensaje claro (no crash) | `tests/review.test.mjs` "sin proveedor configurado…", "host no permitido, red caída o respuesta rara…" | ✅ endpoint o modelo vacíos dan `NO_PROVIDER` sin llamar al proveedor; host no permitido, error de red y respuesta sin JSON dan mensaje |
| AC4 test con proveedor mock | `tests/review.test.mjs` `mock()` | ✅ registra URL, modelo, `stream: false` y el prompt con la skill |

Capturas: no hay Obsidian ni display en este entorno; el modal queda en el check manual de `tests/obsidian.md` § #17.

## Test gaps (not written)
- Medium: `jsonArray` toma del primer `[` al último `]`; una respuesta como `Mira [1]: [{"tipo":"estilo","cita":"Elena","mensaje":"x"}]` da "no devolvió hallazgos" en vez de 1 hallazgo (`src/review.ts:114`).
- Medium: el clic del modal (`setCursor` en `linea-1`, `columna-1`) solo se cubre con el check manual.
- Low: el aviso "Revisando la escena con IA…" sale antes del mensaje de sin proveedor (`src/main.ts:506`).
- Low: una cita repetida se ancla a su primera aparición en el cuerpo.
