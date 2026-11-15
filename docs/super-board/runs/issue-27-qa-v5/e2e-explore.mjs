import { sceneOrder, manuscriptScenes, docxFile, assembleMarkdown, exportManuscript } from "../../../../src/export.ts";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const vault = {
 "Libro/Indice.md": "---\nlongform:\n  format: scenes\n  title: Mi Novela\n  sceneFolder: /\n  scenes:\n    - Cap 02\n    - - Hija\n    - Cap 01\n---\n",
 "Libro/Cap 02.md": "---\nFecha escena: 2024-01-01\nPersonajes en escena:\n  - Ana\ntags: [x]\n---\nPrimero con [[Ana|la heroína]] y ![[img.png]] fin.\n\nSegundo párrafo & <raro> \u000b ok.",
 "Libro/Hija.md": "---\n\nTexto sin YAML tras una pausa.\n\n---\n\nSigue.",
 "Libro/Cap 01.md": "Sin frontmatter. ![[mapa.png|300]] [[Lugar]].",
};
const order = sceneOrder(vault["Libro/Indice.md"]);
console.log("order", JSON.stringify(order));
const { escenas, faltan } = await manuscriptScenes("Libro/Indice.md", order, async (p) => { if (!(p in vault)) throw new Error(p); return vault[p]; });
console.log("faltan", faltan);
console.log(assembleMarkdown(escenas));
writeFileSync("out.docx", docxFile(escenas));
for (const f of ["epub","pdf"]) {
 const r = await exportManuscript(f, "Mi Novela", escenas, ".", { writeBinary: async()=>{}, pandoc: async (args, input) => { execFileSync("pandoc", args, { input, stdio: ["pipe","pipe","pipe"] }); } });
 console.log(f, JSON.stringify(r));
}
