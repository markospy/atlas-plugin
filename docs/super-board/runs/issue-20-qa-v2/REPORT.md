# QA v2 · issue #20 · chapters: grafo de dependencias de hechos

Head probado: `af03a46` (ronda 2 del builder: R1–R3) más el test de QA v2. ACs no visuales: funciones puras en `src/dependencies.ts` y dos comandos (`Notice` / portapapeles). Sin capturas.

| AC | Prueba | Resultado |
|---|---|---|
| AC1 aristas introduce/usa con ids de hecho | `tests/dependencies.test.mjs:31`, `tests/dependencies-qa.test.mjs:18`, `tests/dependencies-qa.test.mjs:44` (`usos` + `conocimiento` del mismo hecho dan una sola arista) | ✅ |
| AC2 "quién depende del hecho X" devuelve capítulos | `tests/dependencies.test.mjs:43`, `:56` (solo `conocimiento`), `tests/dependencies-qa.test.mjs:9` | ✅ |
| AC3 volcado JSON del grafo | `tests/dependencies.test.mjs:77`, `tests/dependencies-qa.test.mjs:27`, `:44` | ✅ |
| AC4 ejemplo carta (cap 3 → 9, 14) | `tests/dependencies.test.mjs:43` → `[9, 14]` | ✅ |

Revisión ronda 1: R1 (`conocimiento` cuenta como uso) comprobado con el test v2, que además cubre un `conocimiento` adelantado (aviso, no fallo). R2 texto del aviso comprobado. R3 revisado a mano (ver huecos).

## Huecos de test
- Escrito (v2): `conocimiento` antes de que se introduzca el hecho, deduplicado con `usos` y reflejado en el volcado.
- Sin escribir (Medium): el README dice "Desde cualquier nota del proyecto", pero `memoryFolder` resuelve `Novela/Personajes/Elena.md` a `Novela/Personajes/_Memoria` (`src/sheets.ts:20`). Desde una ficha de personaje o lugar el comando lee una carpeta vacía y dice "Ningún capítulo lo usa." Funciona desde `Manuscrito/`, `_Memoria/` y la raíz del proyecto. Arreglarlo exige cambiar código de la app; ningún AC lo pide.
- Sin escribir (Low): los comandos de `main.ts` siguen sin test (API de Obsidian).

## Comandos
- `npm test`: 266/268 (`npm-test.log`). Los 2 fallos son los de `tests/extract-qa.test.mjs` (bug #70), ya presentes en `staging`.
- `npm run build`: tsc + esbuild limpio (`build.log`).
