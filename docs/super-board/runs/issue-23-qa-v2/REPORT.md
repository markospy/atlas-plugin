# QA #23 · v2 · head `48f4a6c`

| AC | Resultado | Prueba |
|---|---|---|
| AC1 Escenas pueden declarar marca temporal | ✅ | `tests/chronology.test.mjs:20` · `:100` (carpeta, alias, encabezado) · `tests/chronology-qa.test.mjs:6` |
| AC2 Lugares/rutas declaran duración mínima | ✅ | `tests/chronology.test.mjs:40` · `:118` (origen por nombre de archivo) · `:124` (columna cero) · `tests/chronology-qa.test.mjs:18` |
| AC3 El chequeo lista pares imposibles | ✅ | `tests/chronology.test.mjs:49`, `:81`, `:100`, `:134` (solo `Manuscrito/` y `tipo: lugar`) · `tests/chronology-qa.test.mjs:26` |
| AC4 Test con viaje demasiado corto | ✅ | `tests/chronology.test.mjs:49` · límite exacto (7 días = mínimo, sin aviso) `:63` |

- `npm test`: 112/112 (`npm-test.log`)
- `npm run build`: limpio (`build.log`)
- Arreglos de la ronda 1 comprobados: R1 `:100`, R2 `:118`, R3 `:124`, R6 `:134`, R5 `README.md:55`
- Fusión con `staging` (2 commits por delante): sin conflictos (`git merge-tree`)
- Sin UI nueva salvo un `Notice`: sin capturas; el comando no se probó dentro de Obsidian (sin harness)

## Huecos de test (no escritos)
Reproducidos con una sonda local, sin commit:
- Medio: mayúsculas. `lugar: "[[faro]]"` no casa con la ruta de `Faro.md` y el viaje imposible no avisa; Obsidian resuelve enlaces sin distinguir mayúsculas.
- Medio: comentario YAML. `- a: Puerto # mar` + `dias: 7 # min` da `[]`: la ruta se pierde sin aviso.
- Bajo: `[[Puerto.md]]` queda como `Puerto.md` y no casa con `Puerto`.
- Bajo: `viajes: ` con espacio final, `viajes: [{a: Puerto, dias: 7}]` (flujo) y `días:` con tilde dan `[]`; una línea en blanco dentro de `viajes` corta la lista.
- Bajo: `dias: -1` se acepta como ruta; `dia: 2,5` (coma decimal) deja la escena fuera.
- Bajo: el comando **Revisar cronología** (`src/main.ts:251`) sin test ni prueba en Obsidian (R4).
