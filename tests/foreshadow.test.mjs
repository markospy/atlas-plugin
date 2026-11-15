import assert from "node:assert/strict";
import test from "node:test";

import { projectOf } from "../src/entities.ts";
import {
	canMove,
	CLUE_STATES,
	clueFolder,
	clueNote,
	forgottenObjects,
	nextState,
	openClues,
	parseClue,
} from "../src/foreshadow.ts";

const clue = (name, estado) => ({
	path: `Novela/Trama/${name}.md`,
	text: `---\ntipo: pista\nnombre: "${name}"\nestado: ${estado}\nsembrado: "[[Cap 02]]"\n---\n`,
});

test("la plantilla crea una pista sembrada con los tres estados documentados", () => {
	assert.deepEqual(CLUE_STATES, ["sembrado", "reforzado", "resuelto"]);
	const note = clueNote("La carta");
	assert.match(note, /^tipo: pista$/m);
	assert.match(note, /sembrado \| reforzado \| resuelto/);
	const parsed = parseClue(note);
	assert.equal(parsed.nombre, "La carta");
	assert.equal(parsed.estado, "sembrado");
	for (const estado of CLUE_STATES) {
		assert.equal(parseClue(clue("X", estado).text).estado, estado);
	}
	assert.equal(clueFolder("Novela/Manuscrito/Cap 01.md"), "Novela/Trama");
	assert.equal(clueFolder("Novela/Trama/La carta.md"), "Novela/Trama");
	assert.equal(projectOf("Novela/Trama/La carta.md"), "Novela");
});

test("transición de estados: solo hacia delante, reforzar se puede repetir", () => {
	assert.equal(nextState("sembrado"), "reforzado");
	assert.equal(nextState("reforzado"), "resuelto");
	assert.equal(nextState("resuelto"), "resuelto");
	assert.equal(nextState("raro"), "sembrado");
	assert.equal(canMove("sembrado", "reforzado"), true);
	assert.equal(canMove("sembrado", "resuelto"), true);
	assert.equal(canMove("reforzado", "reforzado"), true);
	assert.equal(canMove("reforzado", "resuelto"), true);
	assert.equal(canMove("resuelto", "reforzado"), false);
	assert.equal(canMove("reforzado", "sembrado"), false);
	assert.equal(canMove("resuelto", "resuelto"), false);
	assert.equal(canMove("sembrado", "olvidado"), false);
});

test("el tablero lista solo pistas no resueltas del proyecto", () => {
	const notes = [
		clue("Carta", "sembrado"),
		clue("Cicatriz", "reforzado"),
		clue("Llave", "resuelto"),
		{ path: "Novela/Trama/Arco.md", text: "---\ntipo: trama\nnombre: Arco\n---\n" },
		{ path: "Otra/Trama/Ajena.md", text: clue("Ajena", "sembrado").text },
	];
	const open = openClues("Novela", notes);
	assert.deepEqual(
		open.map((item) => [item.nombre, item.estado]),
		[
			["Carta", "sembrado"],
			["Cicatriz", "reforzado"],
		],
	);
	assert.equal(open[0].path, "Novela/Trama/Carta.md");
});

test("objeto con peso narrativo que no reaparece genera aviso", () => {
	const object = (name, funcion) => ({
		path: `Novela/Objetos/${name}.md`,
		text: `---\ntipo: objeto\nnombre: "${name}"\nfuncion: ${funcion}\n---\n`,
	});
	const scene = (name, text) => ({ path: `Novela/Manuscrito/${name}.md`, text });
	const notes = [
		object("Revólver", '"Pistola de Chéjov"'),
		object("Anillo", '"Prueba del crimen"'),
		object("Taza", ""),
		scene("Cap 03", "Elena guarda el revólver en el cajón. Bebe de la taza."),
		scene("Cap 05", "El anillo brilla."),
		scene("Cap 09", "Marcos encuentra el anillo."),
	];
	assert.deepEqual(forgottenObjects("Novela", notes), [
		{ nombre: "Revólver", path: "Novela/Objetos/Revólver.md", escenas: ["Novela/Manuscrito/Cap 03.md"] },
	]);
});
