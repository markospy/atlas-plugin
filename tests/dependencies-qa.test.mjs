import assert from "node:assert/strict";
import test from "node:test";

import { buildFactGraph, dependents, graphDump } from "../src/dependencies.ts";
import { memoryNote, parseMemory } from "../src/memory.ts";

const note = (lines) => parseMemory(["---", "tipo: memoria", ...lines, "---", ""].join("\n"));

test("un capítulo que introduce y usa el mismo hecho no depende de sí mismo ni da aviso", () => {
	const graph = buildFactGraph([
		note(["capitulo: 3", "hechos:", "  - id: carta", '    texto: "x"', "usos:", "  - hecho: carta", '    quien: "[[Elena]]"', "    modo: actua"]),
		note(["capitulo: 9", "hechos: []", "usos:", "  - hecho: carta", '    quien: "[[Elena]]"', "    modo: menciona"]),
	]);
	assert.deepEqual(dependents(graph, "carta"), [9]);
	assert.deepEqual(graph.avisos, []);
});

test("ids entre comillas y sin comillas apuntan al mismo hecho", () => {
	const graph = buildFactGraph([
		note(["capitulo: 3", "hechos:", '  - id: "carta"', '    texto: "x"', "usos: []"]),
		note(["capitulo: 9", "hechos: []", "usos:", "  - hecho: carta", '    quien: "[[Elena]]"', "    modo: menciona"]),
	]);
	assert.deepEqual(dependents(graph, "carta"), [9]);
	assert.deepEqual(graph.avisos, []);
});

test("la plantilla vacía de memoria da un grafo vacío y un volcado JSON válido", () => {
	const graph = buildFactGraph([parseMemory(memoryNote(1)), parseMemory(memoryNote(2))]);
	assert.deepEqual(graph, { edges: [], avisos: [] });
	assert.deepEqual(JSON.parse(graphDump(graph)), { hechos: {}, aristas: [], avisos: [] });
});

test("el hecho reintroducido después de un uso sigue avisando del uso adelantado", () => {
	const graph = buildFactGraph([
		note(["capitulo: 2", "hechos: []", "usos:", "  - hecho: daga", '    quien: "[[Elena]]"', "    modo: menciona"]),
		note(["capitulo: 4", "hechos:", "  - id: daga", '    texto: "x"', "usos: []"]),
		note(["capitulo: 7", "hechos: []", "usos:", "  - hecho: daga", '    quien: "[[Elena]]"', "    modo: actua"]),
	]);
	assert.deepEqual(dependents(graph, "daga"), [2, 7]);
	assert.equal(graph.avisos.length, 1);
	assert.match(graph.avisos[0], /cap\. 2/);
});
