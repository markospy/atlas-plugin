import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("la plantilla trae hechos y conocimiento vacíos", () => {
	assert.equal(memoryNoteName(3), "Cap 03");
	assert.equal(memoryFolder("Novela/Manuscrito/Cap 03.md"), "Novela/_Memoria");
	const note = memoryNote(3);
	assert.match(note, /^hechos: \[\]$/m);
	assert.match(note, /^conocimiento: \[\]$/m);
	assert.deepEqual(parseMemory(note), { capitulo: 3, hechos: [], conocimiento: [] });
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
