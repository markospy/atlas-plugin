# QA v1 · issue #20 · chapters: grafo de dependencias de hechos

Head probado: `4b364c8` más el commit de tests de QA. ACs no visuales: funciones puras en `src/dependencies.ts` y dos comandos que muestran un `Notice` o copian al portapapeles. Sin capturas.

| AC | Prueba unitaria | Resultado |
|---|---|---|
| AC1 aristas introduce/usa con ids de hecho | `tests/dependencies.test.mjs:31` (sin duplicados, orden), `tests/dependencies-qa.test.mjs:18` (id con y sin comillas) | ✅ |
| AC2 "quién depende del hecho X" devuelve capítulos | `tests/dependencies.test.mjs:43`, `tests/dependencies-qa.test.mjs:9` (el capítulo que introduce y usa no cuenta) | ✅ |
| AC3 volcado JSON del grafo | `tests/dependencies.test.mjs:56`, `tests/dependencies-qa.test.mjs:27` (plantilla vacía da JSON válido) | ✅ |
| AC4 ejemplo carta (cap 3 → 9, 14) | `tests/dependencies.test.mjs:43` → `[9, 14]` | ✅ |

Riesgo del ticket (grafo incompleto → aviso): `tests/dependencies.test.mjs:50`, `tests/dependencies-qa.test.mjs:33`.

## Huecos de test
- Escritos: mismo capítulo introduce y usa; ids con comillas; plantilla vacía; uso adelantado con hecho introducido después.
- Sin escribir (Low): los comandos de `main.ts` (`fact-dependents`, `dump-fact-graph`) no tienen test; dependen de la API de Obsidian. `Copiar grafo` exige tener abierto un capítulo aunque el grafo es de todo el libro.

## Comandos
- `npm test`: 264/266 (`npm-test.log`). Los 2 fallos están en `tests/extract-qa.test.mjs`, ya fallan en `staging` y los sigue el bug #70; esta PR no toca esos archivos.
- `npm run build`: tsc + esbuild limpio (`build.log`)
