# QA #18 · v3 · PR #61 @ `cb3ded1`

Rama `issue-18-ai-co-write-diff`, con `staging` (`fe91686`) dentro tras el merge del builder.

| Comprobación | Comando | Resultado |
|---|---|---|
| Tests | `npm test` | 203/203 · `npm-test-summary.log` |
| Tipos | `npx tsc --noEmit` | limpio |
| Bundle | `npm run build` | exit 0 · `build.log` |

| AC | Prueba | Estado |
|---|---|---|
| AC1 diff contra el texto actual | `tests/cowrite.test.mjs:35`, `:117` · `tests/cowrite-modal.test.mjs:103` | ✅ |
| AC2 rechazar no modifica la nota | `tests/cowrite.test.mjs:61` · `tests/cowrite-modal.test.mjs:110` | ✅ |
| AC3 aprobar aplica y registra en historial de sesión | `tests/cowrite.test.mjs:61`, `:129` · `tests/cowrite-modal.test.mjs:122` | ✅ |
| AC4 proveedor mock y diff de ejemplo | `tests/cowrite.test.mjs:16` `mockProvider` | ✅ |

Merge: `src/main.ts` conserva el comando `check-chronology` (línea 146) y `co-write-scene` (línea 216); las dos importaciones siguen en las líneas 3–5.

Huecos de test sin escribir (no son AC): copia de seguridad antes de aplicar (va en #28) · `resumenes` y `trama` vacíos en `coWriteProposal` (Medium, sin ticket).

Sin capturas: es un plugin de Obsidian sin runtime aquí; los AC se cubren con tests de módulo y del modal.
