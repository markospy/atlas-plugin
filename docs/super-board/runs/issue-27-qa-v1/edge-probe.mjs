import { sceneOrder, manuscriptScenes, docxFile } from "../../../../src/export.ts";
const idx = `---\nlongform:\n  format: scenes\n  title: Novela\n  workflow: Default Workflow\n  sceneFolder: /\n  scenes:\n    - A\n    - - B\n      - C\n    - D\n  ignoredFiles: []\n---\n`;
const o = sceneOrder(idx); console.log(JSON.stringify(o));
const paths=[]; await manuscriptScenes("Libro/Novela.md", o, async p => { paths.push(p); return "x"; }); console.log(paths);
const o2 = sceneOrder(idx.replace("sceneFolder: /", "sceneFolder: Escenas")); const p2=[]; await manuscriptScenes("Libro/Novela.md", o2, async p => { p2.push(p); return "x"; }); console.log(p2);
const o3 = sceneOrder(idx.replace("sceneFolder: /", "sceneFolder: /Escenas")); const p3=[]; await manuscriptScenes("Libro/Novela.md", o3, async p => { p3.push(p); return "x"; }); console.log(p3);
const crlf = sceneOrder(idx.replace(/\n/g, "\r\n")); console.log("crlf", JSON.stringify(crlf));
import { writeFileSync } from "node:fs";
writeFileSync(process.argv[2], docxFile([{titulo:"Ñandú «uno»", texto:"Línea 1\nLínea 2\n\nOtro\u000b bloque \"q\" 'a'"}]));
