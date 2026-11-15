# QA v5 · #27 export DOCX EPUB PDF · head `496e061`

pandoc 3.1.3 en `/usr/bin/pandoc`; sin `pdflatex`, `xelatex` ni `typst`.

| AC | Resultado | Prueba |
|---|---|---|
| AC1 DOCX abrible en orden del índice | ✅ | `tests/export.test.mjs` 13/13; `e2e-explore.log`: `unzip -t` limpio y pandoc relee `Cap 02 · Hija · Cap 01` |
| AC2 EPUB/PDF con pandoc | ✅ EPUB · PDF solo aviso | EPUB real en orden; PDF: `pdflatex not found` sale en el aviso `pandoc falló: …` |
| AC3 sin pandoc, aviso y DOCX | ✅ | `tests/export.test.mjs` "sin pandoc solo se ofrece DOCX…" |
| AC4 test de ensamblado sin pandoc | ✅ | `tests/export.test.mjs` "ensambla el manuscrito en el orden del índice sin pandoc" |

Arreglos de la ronda 4 comprobados a mano (`e2e-explore.mjs`):
- R6: `Fecha escena:` y `Personajes en escena:` no salen en el texto.
- R7: `![[img.png]]` y `![[mapa.png|300]]` desaparecen; `[[Ana|la heroína]]` sale como `la heroína`.
- Un `---` de pausa sin YAML queda en el texto.
- `\u000b` y `&` no rompen el DOCX.

`npm test`: 329/331. Las 2 fallas están en `tests/extract-qa.test.mjs` y fallan igual en `staging` `1784feb`.
`npm run build`: limpio.

Huecos de test (no escritos):
- Medium: en EPUB/PDF, un `<raro>` literal en la prosa se pierde (pandoc lo lee como HTML). En DOCX sí sale.
- Low: el DOCX no se abrió en Word ni en LibreOffice (no hay aquí).
- Low: no se generó un PDF real (falta un motor LaTeX).

La PR choca con `staging` `1784feb` en `src/main.ts`; QA no lo resuelve.
