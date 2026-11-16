# QA #70 v2 · head `9adcd9c`

Resultado: ✅ pasa. Sin huecos High.

## AC
| AC | Resultado | Prueba |
|---|---|---|
| AC1 cierre `--- ` con espacios | ✅ | `tests/extract-qa.test.mjs:128`, `tests/frontmatter-end.test.mjs:19`; sonda CRLF + `---\t` ✅ (`probe.log` → `crlf_tab`) |
| AC2 `hechos: [{...}]` en línea | ✅ | `tests/extract-qa.test.mjs:138`, `:147`, `:161`, `:179` (hueco de v1, ahora verde), `:190` |
| AC3 rondas anteriores | ✅ | `tests/extract-qa.test.mjs:30-123` en verde; comentarios y propiedades a mano siguen (`probe.log` → `blanklines`) |
| AC4 `npm test` entero | ✅ | 375/375 (`npm-test.log`); `npm run build` limpio (`build.log`); `main.js` sin `require("process")` |

La rama está al día con `staging` (`4692062`): lo que pasa aquí es lo que entra en `staging`.

## Comprobaciones extra
- Frontmatter no YAML (`a: b: c`): aprobar falla con aviso y la nota no cambia (`:197`; `probe.log` → `nofm_scene`).
- Nota que termina en `---` sin salto final: un solo frontmatter (`probe.log` → `trailing_no_nl`).
- El hueco High de v1 (`hechos: [` en varias líneas) está cubierto por `:179` y pasa con el arreglo de `yaml`.

## Huecos sin escribir
- Medium: `yaml` reescribe el formato de otros campos al aprobar: `quien: [[Ana]]` sin comillas pasa a `[ [ Ana ] ]`, `aliases: [a, b]` a `[ a, b ]`, `tags:` con `- x` sin sangría pasa a `  - x`, `capitulo: 03` a `3`. El lector del plugin lee lo mismo (`parseMemory` → `quien: "[[Ana]]"`); no se pierden datos. Ya figura en el Risk del PR.
- Low: una nota que abre con un `---` de escena cuyo texto no es YAML válido ahora rechaza la aprobación en vez de anteponer frontmatter (no pierde datos).

Local tests: npm test
