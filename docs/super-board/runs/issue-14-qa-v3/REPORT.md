# QA #14 · v3 · contra e7d2abf

Comando: `npm test` (68/68: 66 en `e7d2abf` + 2 tests QA v3). `npm run build` (`tsc -noEmit -skipLibCheck` + esbuild) limpio. Logs: `npm-test.log`, `build.log`.

La ronda 3 integró `staging` (R4) y cambió la detección de frontmatter (R5). Esta pasada revisa cada AC y prueba R5.

| AC | Test | Resultado |
|---|---|---|
| AC1 al menos 5 reglas base documentadas y testeadas | "hay al menos cinco reglas…", un test por regla; tabla del README | ✅ 5 reglas, caso positivo y negativo |
| AC2 skills con patrón listan línea + mensaje | "las skills con patrón…", "qa: un patrón que casa vacío…" | ✅ línea, columna, `nombre`, `severidad` |
| AC3 "Ignorar aquí" suprime un hallazgo en esa nota | "ignorar aquí suprime…", "qa: ignorar aquí una skill…" | ✅ solo esa regla en esa línea; botón del modal: check manual `tests/obsidian.md` § #14 |
| AC4 tests unitarios por regla sin Obsidian | `node --test` importa `src/linter.ts` | ✅ sin runtime de Obsidian |

## R5 probado

| Caso | Test | Testigo |
|---|---|---|
| frontmatter con lista (`aliases:` + `  - Ana`) | "qa v3: el frontmatter con listas…" | la lista no da `raya-dialogo`; la línea 5 sí |
| frontmatter sin cerrar | ídem | se revisa la nota entera |
| `--- ` con espacio en la línea 1 | ídem | separador, la escena se revisa |
| «dijo» en el frontmatter | "qa v3: un «dijo» del frontmatter…" | no cuenta para la primera línea |

Mutantes: frontmatter sin cerrar salta toda la nota, y `previous` arrastrado del frontmatter. Cada test QA v3 se pone rojo con su mutante y verde al restaurar. Quitar el criterio `clave:` pone rojo el test R5.

Sin capturas: ACs no visuales; motor de texto, la UI de Obsidian no corre headless.

## Test gaps (not written)
- Medium: una clave con espacios en la línea 2 (`fecha de inicio: x`) no se reconoce como frontmatter; sus listas `  - a` dan `raya-dialogo`. Antes de R5 se saltaba. Arreglarlo toca `src/linter.ts:189`.
- Medium: prosa con dos puntos tras un separador (`---` / `Nota: llegó tarde.`) se toma como frontmatter hasta el siguiente `---`; los hallazgos de ese tramo se pierden.
- Low: clave entre comillas (`"titulo": x`) o frontmatter vacío (`---` / `---`) no se reconocen.
- Low: CRLF sigue sin saltar el frontmatter (`Editor.getValue()` entrega `\n`, así que el modal no se ve afectado).
- Low: `LintModal` / `lintNote` en Obsidian no se ejecutaron aquí; los cubre el check manual.
