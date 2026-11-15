import assert from "node:assert/strict";
import test from "node:test";

import { buildFactGraph, dependents, graphDump } from "../src/dependencies.ts";
import { parseMemory } from "../src/memory.ts";

const memory = (chapter, hechos, usos) =>
	parseMemory(
		[
			"---",
			"tipo: memoria",
			`capitulo: ${chapter}`,
			hechos.length > 0 ? "hechos:" : "hechos: []",
			...hechos.flatMap((id) => [`  - id: ${id}`, `    texto: "${id}"`]),
			"conocimiento: []",
			usos.length > 0 ? "usos:" : "usos: []",
			...usos.flatMap((id) => [`  - hecho: ${id}`, `    quien: "[[Elena]]"`, "    modo: menciona"]),
			"---",
			"",
		].join("\n"),
	);

// Ejemplo carta de docs/historial-chat.md § 3.5: el cap. 3 introduce la carta, el 9 y el 14 la usan.
const CARTA = [
	memory(14, [], ["carta"]),
	memory(3, ["carta", "anillo"], []),
	memory(9, [], ["carta", "carta"]),
	memory(10, [], ["anillo"]),
];

test("registra aristas introduce/usa con ids de hecho", () => {
	const graph = buildFactGraph(CARTA);
	assert.deepEqual(graph.edges, [
		{ capitulo: 3, hecho: "anillo", tipo: "introduce" },
		{ capitulo: 3, hecho: "carta", tipo: "introduce" },
		{ capitulo: 9, hecho: "carta", tipo: "usa" },
		{ capitulo: 10, hecho: "anillo", tipo: "usa" },
		{ capitulo: 14, hecho: "carta", tipo: "usa" },
	]);
	assert.deepEqual(graph.avisos, []);
});

test("quién depende de la carta: caps 9 y 14, no los demás", () => {
	const graph = buildFactGraph(CARTA);
	assert.deepEqual(dependents(graph, "carta"), [9, 14]);
	assert.deepEqual(dependents(graph, "anillo"), [10]);
	assert.deepEqual(dependents(graph, "nadie"), []);
});

test("un hecho usado sin introducir antes da aviso, no falla", () => {
	const graph = buildFactGraph([memory(2, [], ["daga"]), memory(5, ["daga"], []), memory(6, [], ["daga", ""])]);
	assert.deepEqual(dependents(graph, "daga"), [2, 6]);
	assert.deepEqual(graph.avisos, ["El cap. 2 usa «daga», que no se introduce en ese capítulo ni en uno anterior."]);
});

test("un hecho solo en conocimiento también es un uso", () => {
	const knows = parseMemory(
		[
			"---",
			"tipo: memoria",
			"capitulo: 9",
			"hechos: []",
			"conocimiento:",
			"  - hecho: carta",
			"    quien: lector",
			"    estado: sabe",
			"usos: []",
			"---",
			"",
		].join("\n"),
	);
	const graph = buildFactGraph([memory(3, ["carta"], []), knows, memory(14, [], ["carta"])]);
	assert.deepEqual(dependents(graph, "carta"), [9, 14]);
	assert.deepEqual(graph.avisos, []);
});

test("el volcado JSON lista hechos con quién los introduce y quién los usa", () => {
	const dump = JSON.parse(graphDump(buildFactGraph(CARTA)));
	assert.deepEqual(dump.hechos, {
		anillo: { introduce: [3], usa: [10] },
		carta: { introduce: [3], usa: [9, 14] },
	});
	assert.equal(dump.aristas.length, 5);
	assert.deepEqual(dump.avisos, []);
});
