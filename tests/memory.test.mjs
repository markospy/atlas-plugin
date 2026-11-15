import assert from "node:assert/strict";
import test from "node:test";

import {
	chapterNumber,
	KNOWLEDGE_STATES,
	knowledgeErrors,
	memoryFolder,
	memoryNote,
	memoryNoteName,
	parseMemory,
	whatKnows,
} from "../src/memory.ts";

const CAP_03 = `---
tipo: memoria
capitulo: 3
hechos:
  - id: padre
    texto: "El juez es el padre de Elena"
    verdad: true
conocimiento:
  - hecho: padre
    quien: "[[Elena]]"
    estado: sabe
  - hecho: padre
    quien: lector
    estado: sospecha
---
`;

const CAP_07 = `---
tipo: memoria
capitulo: 7
hechos:
  - id: carta
    texto: "La carta la escribió Iván"
    verdad: false
conocimiento:
  - hecho: padre
    quien: lector
    estado: sabe
  - hecho: carta
    quien: "[[Elena|la Doctora]]"
    estado: cree-falso
---
`;

test("la plantilla trae hechos, conocimiento y usos vacíos", () => {
	assert.equal(memoryNoteName(3), "Cap 03");
	assert.equal(memoryFolder("Novela/Manuscrito/Cap 03.md"), "Novela/_Memoria");
	const note = memoryNote(3);
	assert.match(note, /^hechos: \[\]$/m);
	assert.match(note, /^conocimiento: \[\]$/m);
	assert.deepEqual(parseMemory(note), { capitulo: 3, hechos: [], conocimiento: [], usos: [] });
});

test("el personaje sabe lo que el lector solo sospecha", () => {
	const memories = [parseMemory(CAP_03)];
	assert.deepEqual(whatKnows(memories, "[[Elena]]", 3), [
		{ hecho: "padre", texto: "El juez es el padre de Elena", verdad: true, estado: "sabe" },
	]);
	assert.deepEqual(whatKnows(memories, "lector", 3), [
		{ hecho: "padre", texto: "El juez es el padre de Elena", verdad: true, estado: "sospecha" },
	]);
	assert.deepEqual(whatKnows(memories, "Iván", 3), []);
});

test("cuenta solo hasta el capítulo pedido y gana el estado más reciente", () => {
	const memories = [parseMemory(CAP_07), parseMemory(CAP_03)];
	assert.equal(whatKnows(memories, "lector", 5)[0]?.estado, "sospecha");
	assert.equal(whatKnows(memories, "lector", 7)[0]?.estado, "sabe");
	assert.deepEqual(whatKnows(memories, "Elena", 7), [
		{ hecho: "padre", texto: "El juez es el padre de Elena", verdad: true, estado: "sabe" },
		{ hecho: "carta", texto: "La carta la escribió Iván", verdad: false, estado: "cree-falso" },
	]);
});

test("acepta los cuatro estados y avisa de los demás", () => {
	assert.deepEqual([...KNOWLEDGE_STATES], ["ignora", "sospecha", "cree-falso", "sabe"]);
	for (const estado of KNOWLEDGE_STATES) {
		const note = CAP_03.replace("estado: sabe", `estado: ${estado}`);
		assert.deepEqual(knowledgeErrors(parseMemory(note)), []);
	}
	const bad = parseMemory(CAP_03.replace("estado: sabe", "estado: intuye"));
	assert.deepEqual(knowledgeErrors(bad), ["Estado «intuye» no válido para padre: usa ignora, sospecha, cree-falso o sabe."]);
	assert.deepEqual(whatKnows([bad], "Elena", 3), []);
});

test("la consulta normaliza a quién y no cuenta capítulos anteriores a la memoria", () => {
	const memories = [parseMemory(CAP_03)];
	const elena = [{ hecho: "padre", texto: "El juez es el padre de Elena", verdad: true, estado: "sabe" }];
	assert.deepEqual(whatKnows(memories, "elena", 3), elena);
	assert.deepEqual(whatKnows(memories, " [[Elena|la Doctora]] ", 3), elena);
	assert.equal(whatKnows(memories, "[[lector]]", 3)[0]?.estado, "sospecha");
	assert.deepEqual(whatKnows(memories, "Elena", 2), []);
});

test("el número de capítulo sale solo de un nombre que empieza por Cap", () => {
	assert.equal(chapterNumber("Manuscrito/Cap 05.md"), 5);
	assert.equal(chapterNumber("Manuscrito/cap.12 El juicio.md"), 12);
	assert.equal(chapterNumber("Manuscrito/Recap 5.md"), null);
	assert.equal(chapterNumber("Notas/Escape 2.md"), null);
});

test("lee una memoria con CRLF y comillas simples", () => {
	const note = CAP_03.replace(`quien: "[[Elena]]"`, `quien: '[[Elena]]'`).replace(/\n/g, "\r\n");
	const memory = parseMemory(note);
	assert.equal(memory.capitulo, 3);
	assert.equal(memory.hechos.length, 1);
	assert.deepEqual(whatKnows([memory], "Elena", 3), [
		{ hecho: "padre", texto: "El juez es el padre de Elena", verdad: true, estado: "sabe" },
	]);
});

test("lee listas sin sangría", () => {
	const note = `---
capitulo: 3
hechos:
- id: padre
  texto: "El juez es el padre de Elena"
  verdad: true
conocimiento:
- hecho: padre
  quien: lector
  estado: sospecha
---
`;
	const memory = parseMemory(note);
	assert.deepEqual(memory.hechos, [{ id: "padre", texto: "El juez es el padre de Elena", verdad: true }]);
	assert.deepEqual(memory.conocimiento, [{ hecho: "padre", quien: "lector", estado: "sospecha" }]);
});
