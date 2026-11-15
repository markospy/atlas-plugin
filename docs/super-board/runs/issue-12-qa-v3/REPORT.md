# QA #12 · v3 · continuity

Head probado: `7cacd4b` (PR #58, rebuild R6, R8). Sin UI propia: el comando muestra un `Notice` de Obsidian; no hay capturas.

| AC | Resultado | Prueba |
|---|---|---|
| 1 · mención de hecho que el lector `ignora` → spoiler | ✅ | `tests/continuity.test.mjs:62` · sin spoiler si el lector ya sabe `:72` |
| 2 · acción sobre hecho que el personaje no `sabe` → omnisciente | ✅ | `tests/continuity.test.mjs:85` · `cree-falso` propio se respeta `:94` |
| 3 · lector sabe, personaje no → ironía, `error: false` | ✅ | `tests/continuity.test.mjs:169` · alias sin ironía doble `:152` |
| 4 · test con los tres casos | ✅ | `npm test` 132/132 · `npm-test.log` |

Build: `npm run build` limpio (`npm-build.log`). Fusión de prueba con `origin/staging` (`11d6bf3`): sin conflictos.

## Hallazgos del revisor

- R6 · `usageErrors` avisa de un `hecho` sin declarar en `hechos` hasta N (`tests/continuity.test.mjs:122`; sondeo casos 1–3). La alerta omnisciente/spoiler falsa sigue saliendo junto al aviso (caso 1).
- R8 · test renombrado (`tests/memory.test.mjs:50`).

## Sondeo de bordes (`edge-probe.out`)

Comprobado: hecho sin declarar avisa; declarado en N+1 sigue avisando en N; declarado en N no avisa; actuar en `sospecha` da omnisciente; `sospecha` da ironía; capítulo vacío sin alertas; el lector que aprende en N no da spoiler.

## Huecos de test (no escritos, Medium/Low)

- Medium · un hecho sin declarar da a la vez el aviso y la alerta omnisciente/spoiler (caso 1); el aviso apunta al `id` mal escrito.
- Low · el comando no se ejecutó dentro de Obsidian (sin arnés).
