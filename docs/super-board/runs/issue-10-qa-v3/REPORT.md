# QA #10 · v3 · contra 2392b55

Comando: `npm test` (90/90) y `npm run build` (`tsc -noEmit -skipLibCheck` + esbuild production). Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 plantilla `_Memoria/Cap NN.md` con `hechos` y `conocimiento` | `tests/memory.test.mjs:48` | ✅ nombre `Cap 03`, carpeta `Novela/_Memoria`, listas vacías que se vuelven a leer |
| AC2 consulta "qué sabe [[Elena]] / el lector en cap. N" | `tests/memory.test.mjs:57`, `:68`, `:89` | ✅ `[[Elena]]`, `elena`, `[[Elena\|la Doctora]]`, `lector`, `[[lector]]`; solo cuentan capítulos ≤ N; gana el estado más reciente |
| AC3 estados ignora, sospecha, cree-falso, sabe | `tests/memory.test.mjs:78` | ✅ los cuatro aceptados; `intuye` avisado y fuera de la consulta |
| AC4 hecho que sabe un personaje y el lector solo sospecha | `tests/memory.test.mjs:57` | ✅ Elena `sabe`, lector `sospecha`, Iván nada |

## Cambios desde v2
- `src/memory.ts` y `tests/memory.test.mjs` sin cambios desde `a5046df`.
- Merge de `staging` (`8563d94`): el diff de `src/main.ts` contra `staging` solo añade líneas (imports, `new-memory`, `what-knows`); typecheck y build limpios.

Los dos comandos de `src/main.ts` no se ejecutan aquí: los tests de node no tienen runtime de Obsidian. Nada visual que capturar.

## Huecos de test (no escritos)
- Medio: YAML válido que el parser descarta sin aviso, probado con un script aparte: listas sin sangría (`- id: padre`), notas con CRLF (`capitulo: 0`), comillas simples (`quien: '[[Elena]]'` no casa con `[[Elena]]`). Arreglo posible: leer el frontmatter con `metadataCache` / `parseYaml` de Obsidian.
- Medio: un capítulo en subcarpeta (`Novela/Manuscrito/Parte 1/Cap 03.md`) busca la memoria en `Parte 1/_Memoria`.
- Medio: `newMemory` y `whatKnowsHere` sin test automático (sin runtime de Obsidian).
- Bajo: un comentario YAML en línea (`estado: sabe # ok`) se lee como estado no válido; se avisa.
