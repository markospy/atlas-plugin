// Genera un DOCX con el índice de ejemplo de tests/export.test.mjs (sin pandoc) y lo escribe en argv[2].
import { writeFileSync } from "node:fs";
import { docxFile, manuscriptScenes, sceneOrder } from "../../../../src/export.ts";
const INDEX = `---\nlongform:\n  title: "Mi Novela"\n  sceneFolder: Manuscrito\n  scenes:\n    - Cap 02\n    - - Escena hija\n    - Cap 01\n---\n`;
const SCENES = {
	"Novela/Manuscrito/Cap 01.md": "---\npov: \"[[Elena]]\"\n---\nElena llega al [[Puerto|puerto]].\n\nLlueve & hace <frío>.\n",
	"Novela/Manuscrito/Cap 02.md": "Primero va esta.\n",
	"Novela/Manuscrito/Escena hija.md": "Luego la hija «ñ».\n",
};
const { escenas } = await manuscriptScenes("Novela/Mi Novela.md", sceneOrder(INDEX), async (p) => SCENES[p]);
writeFileSync(process.argv[2], docxFile(escenas));
