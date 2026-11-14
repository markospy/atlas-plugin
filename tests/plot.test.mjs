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
