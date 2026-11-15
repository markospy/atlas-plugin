# QA #18 · v1 · contra 266f373

Comando: `npm test` (170/170 pasan: 6 en `tests/cowrite.test.mjs`, 5 nuevos en `tests/cowrite-modal.test.mjs`, 1 de `ollamaProvider` en `tests/providers.test.mjs`) y `npm run build` (tsc + esbuild limpios). Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 la propuesta se muestra como diff contra el texto actual | `tests/cowrite.test.mjs:21`, `:35` (diff `quitar`/`añadir`, frontmatter conservado) · `tests/cowrite-modal.test.mjs:103` | ✅ el modal pinta `  `/`- `/`+ ` por línea contra `editor.getValue()` y no escribe antes de decidir |
| AC2 rechazar no modifica la nota | `tests/cowrite.test.mjs:61` · `tests/cowrite-modal.test.mjs:110` | ✅ cero `setValue`; la nota queda igual; queda `rechazada` en el historial |
| AC3 aprobar aplica y registra en el historial de la sesión | `tests/cowrite.test.mjs:61` · `tests/cowrite-modal.test.mjs:122`, `:130` | ✅ un `setValue` con la propuesta; entrada `aprobada` con antes/después/fecha; nota cambiada → aviso, sin escritura, sin entrada |
| AC4 test con proveedor mock y diff de ejemplo | `tests/cowrite.test.mjs:16` `mockProvider` · `tests/providers.test.mjs` `ollamaProvider` con `post` falso | ✅ |

Tests nuevos de QA: `tests/cowrite-modal.test.mjs` empaqueta el `CoWriteModal` real con esbuild y cambia `obsidian` por un stub (DOM mínimo, `Notice`, `Modal`). Checks manuales añadidos en `tests/obsidian.md` § #18.

Mutantes probados (rojo y restaurado, no commiteados): Rechazar llama a `editor.setValue` → falla "Rechazar no escribe"; Aprobar escribe `proposal.propuesta` sin `session.aprobar` → fallan "Aprobar escribe…" y "nota cambiada".

Sin capturas: es un plugin de Obsidian sin runtime en este entorno; la evidencia es el log de tests y los checks manuales.

## Test gaps (not written)
- Medium: aprobar dos veces la misma propuesta falla la segunda (la nota ya cambió), pero ningún test lo fija.
- Medium: `diffLines` es O(n·m) en memoria (`Int32Array`); una escena de 5000 líneas contra otra igual reserva ~100 MB. Sin test de volumen.
- Low: `ollamaProvider` con `response` que no es string devuelve "" y `propose` falla con "vacía"; ningún test cubre ese paso entre los dos.
- Low: si el modelo devuelve su propio frontmatter en **Borrador**/**Alternativa**, la nota queda con dos bloques.
- Low: no hay copia de seguridad antes de aplicar (ticket aparte, según Risk del PR).
