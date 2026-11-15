# QA v3 · issue #20 · chapters: grafo de dependencias de hechos

Head probado: `e9f9a00` (ronda 3 del builder: R5–R7) más los tests de QA v3. ACs no visuales: funciones puras en `src/dependencies.ts` y `src/memory.ts`, y dos comandos (`Notice` / portapapeles). Sin capturas.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 aristas introduce/usa con ids de hecho | `tests/dependencies.test.mjs:31`, `tests/dependencies-qa.test.mjs:44` | ✅ |
| AC2 "quién depende del hecho X" devuelve capítulos | `tests/dependencies.test.mjs:43`, `:56`, `tests/dependencies-qa.test.mjs:65` (desde una ficha de `Personajes/`) | ✅ |
| AC3 volcado JSON del grafo | `tests/dependencies.test.mjs:77`, `tests/dependencies-qa.test.mjs:27` | ✅ |
| AC4 ejemplo carta (cap 3 → 9, 14) | `tests/dependencies.test.mjs:43`, `tests/dependencies-qa.test.mjs:65` → `[9, 14]` | ✅ |

Revisión ronda 2: R5 (`projectMemoryFolder`, `src/memory.ts:59`) comprobado con `tests/memory.test.mjs:59` y `tests/dependencies-qa.test.mjs:57` (subcarpetas hondas de `Manuscrito/`, `Lugares/`, `_Memoria/`, proyecto dentro de otra carpeta). El filtro por `_Memoria/` con barra final no mezcla otro proyecto ni `_MemoriaVieja/` (`tests/dependencies-qa.test.mjs:65`). R6 (aviso con cero memorias, `src/main.ts:501`) revisado a mano: los dos comandos pasan por `projectMemories()` y salen con el aviso antes de armar el grafo.

## Huecos de test
- Escrito (v3): resolución del `_Memoria/` desde subcarpetas hondas y proyectos anidados; grafo armado desde una ficha con memorias de otro proyecto al lado.
- Sin escribir (Low): `projectMemoryFolder` busca desde la carpeta más honda, así que `Novela/Trama/Personajes/Arco.md` resuelve a `Novela/Trama/_Memoria`. Solo pasa si dentro de una carpeta del proyecto hay otra con nombre de carpeta del proyecto; ningún AC lo pide.
- Sin escribir (Low): los comandos de `main.ts` siguen sin test (API de Obsidian).

## Comandos
- `npm test`: 269/271 (`npm-test.log`). Los 2 fallos son los de `tests/extract-qa.test.mjs` (bug #70), también presentes en `staging` y en la base de la rama.
- `npm run build`: tsc + esbuild limpio (`build.log`).
