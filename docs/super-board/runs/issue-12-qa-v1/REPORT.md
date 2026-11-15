# QA #12 · v1 · continuity

Head probado: `1e0b542` (PR #58). Sin UI propia: el comando muestra un `Notice` de Obsidian; no hay capturas.

| AC | Resultado | Prueba |
|---|---|---|
| 1 · mención de hecho que el lector `ignora` → spoiler | ✅ | `tests/continuity.test.mjs:62` (y `:72` sin spoiler cuando el lector ya sabe) |
| 2 · acción sobre hecho que el personaje no `sabe` → omnisciente | ✅ | `tests/continuity.test.mjs:85`, `cree-falso` nombrado en `:94` |
| 3 · lector sabe, personaje no → ironía, `error: false` | ✅ | `tests/continuity.test.mjs:108` |
| 4 · test con los tres casos | ✅ | `npm test` 129/129 · `npm-test.log` |

Build: `npm run build` limpio (`npm-build.log`).

## Huecos de test (no escritos, Medium/Low)

Sondeo en `edge-probe.out`:

- Medium · `modo: actúa` (con tilde) se ignora en silencio: no hay alerta de omnisciencia. La plantilla dice `actua`, pero no hay aviso de modo desconocido.
- Low · un mismo personaje escrito con alias (`[[Elena|E]]`) y sin enlace (`Elena`) en el mismo capítulo da dos alertas de ironía repetidas: `pair()` no quita el alias como hace `holderKey()`.
- Low · el lector en `sospecha` no dispara spoiler (coincide con el AC, que solo pide `ignora`).
- Comprobado: un capítulo posterior no filtra conocimiento hacia atrás.

No probado dentro de Obsidian (sin arnés): solo la lógica pura y el build.
