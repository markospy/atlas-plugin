# QA #12 · v2 · continuity

Head probado: `f5e470a` (PR #58, rebuild R1–R3). Sin UI propia: el comando muestra un `Notice` de Obsidian; no hay capturas.

| AC | Resultado | Prueba |
|---|---|---|
| 1 · mención de hecho que el lector `ignora` → spoiler | ✅ | `tests/continuity.test.mjs:62` · sin spoiler si el lector ya sabe `:72` |
| 2 · acción sobre hecho que el personaje no `sabe` → omnisciente | ✅ | `tests/continuity.test.mjs:85` · `cree-falso` propio se respeta `:94` |
| 3 · lector sabe, personaje no → ironía, `error: false` | ✅ | `tests/continuity.test.mjs:139` · alias sin ironía doble `:122` |
| 4 · test con los tres casos | ✅ | `npm test` 131/131 · `npm-test.log` |

Build: `npm run build` limpio (`npm-build.log`).

## Hallazgos del revisor (dueño qa)

- R4 · el test de aislamiento ya no filtra `ironia`: compara la lista completa en el cap. 4 y comprueba que un `sabe` del cap. 6 no borra el spoiler del cap. 5 (`tests/continuity.test.mjs:170`).
- R5 · cita corregida: ironía está en `:139` (v1 citaba `:108`). El comando sigue sin probarse dentro de Obsidian.

## Sondeo de bordes (`edge-probe.out`)

Comprobado: alias en `usos` (`[[Iván|I]]`) casa con `Iván`; aprender en el mismo cap. N no avisa; un `cree-falso` registrado después de N no cuenta; omnisciente + ironía da una sola alerta; `usos` de N no se filtran a N+1; `modo` en mayúscula o vacío avisa.

## Huecos de test (no escritos, Medium/Low)

- Medium · un hecho con `conocimiento` pero sin declarar en `hechos` se trata como sin registrar: da omnisciente o spoiler falso sin aviso (caso 10). `whatKnows` solo devuelve hechos declarados.
- Low · el lector en `cree-falso` o `sospecha` no dispara spoiler al mencionar el hecho (caso 1; el AC solo pide `ignora`).
- Low · `quien: lector` con `modo: menciona` da un spoiler atribuido al lector (caso 9).
