# QA #10 · v2 · contra 84baa58

Comando: `npm test` (56/56) más `npx tsc -noEmit -skipLibCheck` y `node esbuild.config.mjs production`. Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 plantilla `_Memoria/Cap NN.md` con `hechos` y `conocimiento` | `tests/memory.test.mjs:48` | ✅ nombre `Cap 03`, carpeta `Novela/_Memoria`, listas vacías que se vuelven a leer |
| AC2 consulta "qué sabe [[Elena]] / el lector en cap. N" | `tests/memory.test.mjs:57`, `:68`, `:89` | ✅ `[[Elena]]`, `elena`, `[[Elena\|la Doctora]]`, `lector`, `[[lector]]`; solo cuentan capítulos ≤ N; gana el estado más reciente |
| AC3 estados ignora, sospecha, cree-falso, sabe | `tests/memory.test.mjs:78` | ✅ los cuatro aceptados; `intuye` avisado y fuera de la consulta |
| AC4 hecho que sabe un personaje y el lector solo sospecha | `tests/memory.test.mjs:57` | ✅ Elena `sabe`, lector `sospecha`, Iván nada |

## Cambios desde v1
- R2: `chapterNumber` anclado al inicio del nombre (`src/memory.ts:38`). El test `tests/memory.test.mjs:102` se vio en rojo al quitar el `^` (1 fallo) y en verde al restaurarlo.
- Merge con `staging` (`47868d9`): `src/main.ts` conserva todos los comandos de `staging` y añade `new-memory` y `what-knows`; typecheck y build limpios.

Los dos comandos de `src/main.ts` no se ejecutan aquí: los tests de node no tienen runtime de Obsidian. Nada visual que capturar.

## Huecos de test (no escritos)
- Medio: notas con CRLF se leen vacías (`capitulo: 0`) sin aviso.
- Medio: listas YAML sin sangría (`- id: padre`) se descartan sin aviso.
- Medio: un capítulo en subcarpeta (`Novela/Manuscrito/Parte 1/Cap 03.md`) busca la memoria en `Parte 1/_Memoria`.
- Medio: `newMemory` y `whatKnowsHere` sin test automático (sin runtime de Obsidian).
- Bajo: un comentario YAML en línea (`estado: sabe # ok`) se lee como estado no válido; se avisa.
