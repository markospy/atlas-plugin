# QA #18 · v2 · contra 96ae697

Comando: `npm test` (174/174 pasan) y `npm run build` (tsc + esbuild limpios). Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 la propuesta se muestra como diff contra el texto actual | `tests/cowrite.test.mjs:21`, `:35`, `:117` · `tests/cowrite-modal.test.mjs:103` | ✅ |
| AC2 rechazar no modifica la nota | `tests/cowrite.test.mjs:61`, `:117` · `tests/cowrite-modal.test.mjs:110` | ✅ |
| AC3 aprobar aplica y registra en el historial de la sesión | `tests/cowrite.test.mjs:61`, `:129` · `tests/cowrite-modal.test.mjs:122`, `:130` | ✅ |
| AC4 test con proveedor mock y diff de ejemplo | `tests/cowrite.test.mjs:16` `mockProvider` | ✅ |

## Arreglos del rebuild (R1, R3)
- R1: `coWriteContext` suma `noteBody(escena).length` al presupuesto; la sección `escena` de `buildSceneContext` mide justo eso, así que skills y fichas conservan sus 8000 caracteres. Mutante (presupuesto sin la escena) → `tests/cowrite.test.mjs:86` en rojo.
- R3: mutante (frontmatter y respuesta unidos con `\n`) → `tests/cowrite.test.mjs:109` en rojo.
- Mutantes restaurados, no commiteados.

## Tests nuevos de QA (v2)
- `:117` R4 — respuesta del modelo con su propio frontmatter en Borrador: la propuesta queda con dos bloques, pero el diff muestra `---`, `pov` y `---` como líneas añadidas; Rechazar deja la nota igual. Fija que no es silencioso.
- `:129` aprobar dos veces la misma propuesta falla la segunda y registra una sola entrada (hueco Medium de v1).

Sin capturas: plugin de Obsidian sin runtime en este entorno. Checks manuales en `tests/obsidian.md` § #18.

## Test gaps (not written)
- Low: el frontmatter doble de R4 no se quita; se ve en el diff y el escritor puede rechazar. Quitarlo cambia `src/cowrite.ts`.
- Medium: `diffLines` es O(n·m) en memoria; sin test de volumen.
- Low: `ollamaProvider` con `response` que no es string → "" → `propose` falla con "vacía"; sin test de ese paso.
- Low: sin copia de seguridad antes de aplicar (#28).
