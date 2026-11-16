import assert from "node:assert/strict";
import test from "node:test";

import { PLOT_STRUCTURES, parseScene, plotFolder, plotNote, SCENE_FIELDS } from "../src/plot.ts";

const SCENE = `---
objetivo: "Elena quiere la carta"
conflicto: "Marcos la esconde"
resultado: "Elena la encuentra rota"
pov: "[[Elena]]"
subtrama: "[[La carta]]"
---

Elena entró en la cocina.
`;

test("lee objetivo, conflicto, resultado, POV y subtrama de una escena", () => {
	assert.deepEqual(parseScene(SCENE), {
		objetivo: "Elena quiere la carta",
		conflicto: "Marcos la esconde",
		resultado: "Elena la encuentra rota",
		pov: "[[Elena]]",
		subtrama: "[[La carta]]",
	});
	assert.deepEqual(SCENE_FIELDS, ["objetivo", "conflicto", "resultado", "pov", "subtrama"]);
	assert.deepEqual(parseScene("Sin frontmatter."), {
		objetivo: "",
		conflicto: "",
		resultado: "",
		pov: "",
		subtrama: "",
	});
});

test("la plantilla de trama trae las secciones y el esqueleto elegido", () => {
	assert.deepEqual(Object.keys(PLOT_STRUCTURES), ["tres-actos", "save-the-cat", "viaje-del-heroe"]);
	const note = plotNote("Novela", "save-the-cat");
	assert.match(note, /^---\ntipo: trama\nnombre: "Novela"\nestructura: save-the-cat\n---\n/);
	for (const heading of ["Premisa", "Tema", "Conflicto central", "Arcos", "Subtramas", "Estructura: Save the Cat"]) {
		assert.match(note, new RegExp(`^## ${heading}$`, "m"));
	}
	for (const beat of PLOT_STRUCTURES["save-the-cat"].beats) {
		assert.match(note, new RegExp(`^### ${beat}$`, "m"));
	}
	assert.match(plotNote("Novela", "tres-actos"), /^### Acto III$/m);
	assert.match(plotNote("Novela", "viaje-del-heroe"), /^### La llamada a la aventura$/m);
	assert.equal(plotFolder("Novela/Manuscrito/Cap 01.md"), "Novela/Trama");
});

test("la trama cae en la carpeta Trama del proyecto desde cualquier nota", () => {
	assert.equal(plotFolder("Novela/Trama/Principal.md"), "Novela/Trama");
	assert.equal(plotFolder("Trama/Principal.md"), "Trama");
	assert.equal(plotFolder("Manuscrito/Cap 01.md"), "Trama");
	assert.equal(plotFolder("Novela/Notas.md"), "Novela/Trama");
	assert.equal(plotFolder(""), "Trama");
});

test("una escena recién preparada se lee vacía y no confunde claves parecidas", () => {
	const scene = `---
objetivos: "no es objetivo"
objetivo: ""
conflicto: Marcos la esconde
resultado:
pov: "[[Elena]]"
---
subtrama: "fuera del frontmatter"
`;
	assert.deepEqual(parseScene(scene), {
		objetivo: "",
		conflicto: "Marcos la esconde",
		resultado: "",
		pov: "[[Elena]]",
		subtrama: "",
	});
	assert.equal(parseScene(plotNote("Novela", "tres-actos")).pov, "");
});

test("un valor entre comillas respeta los escapes y una comilla suelta queda tal cual", () => {
	const scene = `---
objetivo: "Dijo \\"no\\""
conflicto: "
---
`;
	assert.equal(parseScene(scene).objetivo, 'Dijo "no"');
	assert.equal(parseScene(scene).conflicto, '"');
});

test("una escena con CRLF se lee igual que con LF", () => {
	const scene = '---\r\npov: "[[Elena]]"\r\nsubtrama: Herencia\r\n---\r\nTexto.\r\n';
	assert.equal(parseScene(scene).pov, "[[Elena]]");
	assert.equal(parseScene(scene).subtrama, "Herencia");
});

test("un valor entre comillas simples se lee sin ellas", () => {
	const scene = "---\npov: '[[Elena]]'\nobjetivo: 'It''s now'\n---\n";
	assert.equal(parseScene(scene).pov, "[[Elena]]");
	assert.equal(parseScene(scene).objetivo, "It's now");
});

test("el frontmatter de cada trama se relee con el parser compartido, también con comillas en el nombre", async () => {
	const { frontmatterBody, scalar } = await import("../src/frontmatter.ts");
	for (const structure of Object.keys(PLOT_STRUCTURES)) {
		for (const name of ["Novela", 'El "Rey" pálido']) {
			const frontmatter = frontmatterBody(plotNote(name, structure));
			assert.equal(scalar(frontmatter, "tipo"), "trama");
			assert.equal(scalar(frontmatter, "nombre"), name);
			assert.equal(scalar(frontmatter, "estructura"), structure);
		}
	}
});
