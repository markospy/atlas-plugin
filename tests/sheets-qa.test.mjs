import assert from "node:assert/strict";
import test from "node:test";

import { characterNote, parseCharacter } from "../src/characters.ts";
import { memoryNote, parseMemory } from "../src/memory.ts";
import { objectNote, parseObject } from "../src/objects.ts";
import { parsePlace, placeNote } from "../src/places.ts";

const crlf = (note) => note.replace(/\n/g, "\r\n");

test("dos listas sin sangría seguidas no se mezclan", () => {
	const note = `---
capitulo: 3
hechos:
- id: a
  texto: "x: y"
  verdad: true
- id: b
  texto: z
conocimiento:
- hecho: a
  quien: "[[Elena]]"
  estado: sabe
---
`;
	const memory = parseMemory(note);
	assert.deepEqual(memory.hechos, [
		{ id: "a", texto: "x: y", verdad: true },
		{ id: "b", texto: "z", verdad: null },
	]);
	assert.deepEqual(memory.conocimiento, [{ hecho: "a", quien: "[[Elena]]", estado: "sabe" }]);
	assert.deepEqual(parseMemory(crlf(note)), memory);
});

test("finales de línea mezclados, tabulador final y línea en blanco dentro de la lista", () => {
	const note = "---\r\ncapitulo: 3\nhechos: \t\r\n  - id: a\r\n    texto: x\n\n  - id: b\r\n    texto: y\r\n---\r\n";
	assert.deepEqual(
		parseMemory(note).hechos.map((fact) => [fact.id, fact.texto]),
		[
			["a", "x"],
			["b", "y"],
		],
	);
});

test("las plantillas nuevas con CRLF dan la misma ficha que con LF", () => {
	for (const [parse, note] of [
		[parseCharacter, characterNote("Elena")],
		[parsePlace, placeNote("Cocina")],
		[parseMemory, memoryNote(3)],
		[parseObject, objectNote("La carta")],
	]) {
		assert.deepEqual(parse(crlf(note)), parse(note));
	}
});
