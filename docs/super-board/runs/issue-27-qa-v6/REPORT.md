# QA v6 · #27 export DOCX EPUB PDF · head `e2cbe59`

pandoc 3.1.3 en `/usr/bin/pandoc`; sin `pdflatex`, `xelatex` ni `typst`.

| AC | Resultado | Prueba |
|---|---|---|
| AC1 DOCX abrible en orden del índice | ✅ | `tests/export.test.mjs` 16/16; `smoke.log`: `unzip -t` limpio y pandoc relee `Cap 02 · Hija · Cap 01` |
| AC2 EPUB/PDF con pandoc | ✅ EPUB · PDF solo aviso | EPUB real en orden; PDF: `pdflatex not found` sale en el aviso `pandoc falló: …` |
| AC3 sin pandoc, aviso y DOCX | ✅ | `smoke.log` "sin pandoc": DOCX se escribe, EPUB avisa con pandoc y DOCX |
| AC4 test de ensamblado sin pandoc | ✅ | `tests/export.test.mjs:53` |

Arreglos de la ronda 5 comprobados (`smoke.mts`, pandoc real):
- R9: la rama fusiona limpia con `staging` `1784feb` (`git merge-tree --write-tree`).
- R10: `pandocBinary` elige `pandoc` del PATH; test de rutas Homebrew en `tests/export.test.mjs:103`.
- R12: `Ella dijo <raro> y siguió.` sale entero en EPUB y DOCX.
- R13: `[[nota#seccion]]`, `[[otra#^bloque]]` salen `nota`, `otra`; `[[x#s|alias]]` sale `alias`; `[[#solo-ancla]]` sale `solo-ancla`.
- Escena sin nota (`Falta`) se nombra en el aviso; `\u000b` y `&` no rompen el DOCX.

`npm test`: 352/354. Las 2 fallas están en `tests/extract-qa.test.mjs` y fallan igual en `staging` `1784feb`.
`npm run build`: limpio.

Huecos de test (no escritos):
- Low: HTML escrito a mano (`<b>`) sale como texto en EPUB/PDF; es el efecto buscado de `-raw_html` y ya está en Risk.
- Low: el DOCX no se abrió en Word ni en LibreOffice (no hay aquí).
- Low: no se generó un PDF real (falta un motor LaTeX).
- Low: macOS real (R10) no probado; solo test unitario.
