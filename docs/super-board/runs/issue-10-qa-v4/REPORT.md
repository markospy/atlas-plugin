# QA #10 · v4 · contra e637f55

Comando: `npm test` (107/107) y `npm run build` (`tsc -noEmit -skipLibCheck` + esbuild production). Log: `npm-test.log`.

| AC | Test | Resultado |
|---|---|---|
| AC1 plantilla `_Memoria/Cap NN.md` con `hechos` y `conocimiento` | `tests/memory.test.mjs:49` | ✅ nombre `Cap 03`, carpeta `Novela/_Memoria`, listas vacías que se vuelven a leer |
| AC2 consulta "qué sabe [[Elena]] / el lector en cap. N" | `tests/memory.test.mjs:58`, `:69`, `:90` | ✅ `[[Elena]]`, `elena`, `[[Elena\|la Doctora]]`, `lector`, `[[lector]]`; solo cuentan capítulos ≤ N; gana el estado más reciente |
| AC3 estados ignora, sospecha, cree-falso, sabe | `tests/memory.test.mjs:79` | ✅ los cuatro aceptados; `intuye` avisado y fuera de la consulta |
| AC4 hecho que sabe un personaje y el lector solo sospecha | `tests/memory.test.mjs:58` | ✅ Elena `sabe`, lector `sospecha`, Iván nada |

## Cambios desde v3
- R4: CRLF y comillas simples se leen (`tests/memory.test.mjs:106`). Comprobado también con un script aparte.
- R5: listas sin sangría se leen (`tests/memory.test.mjs:116`).
- R6: `tests/obsidian.md` tiene `## #10 memoria` con tres checks manuales.
- Merge de `staging` (`738f486`): el diff de `src/main.ts` contra `staging` solo añade líneas; typecheck y build limpios.

Los dos comandos de `src/main.ts` no se ejecutan aquí: los tests de node no tienen runtime de Obsidian. Nada visual que capturar.

## Huecos de test (no escritos)
Probados con un script aparte; ninguno rompe un AC.
- Medio: una memoria sin `capitulo` (o con `capitulo: tres`) cuenta como capítulo 0 y entra en todas las consultas. Arreglo posible: usar `chapterNumber` del nombre de la nota como respaldo.
- Medio: un capítulo en subcarpeta (`Novela/Manuscrito/Parte 1/Cap 03.md`) busca la memoria en `Parte 1/_Memoria`.
- Medio: `newMemory` y `whatKnowsHere` sin test automático (sin runtime de Obsidian); cubiertos por `tests/obsidian.md`.
- Bajo: listas en estilo flujo (`hechos: [{id: x, …}]`) dan 0 hechos sin aviso.
- Bajo: un comentario YAML en línea (`estado: sabe # ok`) o `estado: Sabe` salen como estado no válido; se avisa.
