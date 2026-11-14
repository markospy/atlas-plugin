import assert from "node:assert/strict";
import test from "node:test";

import { buildGraph, chapterNumber, circleLayout, filterGraph, relationTypes } from "../src/graph.ts";

const GRAPH = buildGraph([
	{
		name: "Elena",
		relaciones: [
			{ con: "[[Marcos]]", tipo: "hermano" },
			{ con: "[[Iván|el traidor]]", tipo: "rival", desde: "[[Cap 07]]" },
			{ con: "[[Lucía]]", tipo: "amiga", desde: "[[Cap 02]]", hasta: "[[Cap 05]]" },
		],
	},
	{ name: "Marcos", relaciones: [{ con: "[[Iván]]", tipo: "rival", hasta: "[[Cap 03]]" }] },
]);

const pairs = (graph) => graph.edges.map((edge) => `${edge.from}-${edge.tipo}-${edge.to}`);

test("nodos personaje y aristas tipadas desde las fichas", () => {
	assert.deepEqual(GRAPH.nodes, ["Elena", "Iván", "Lucía", "Marcos"]);
	assert.deepEqual(pairs(GRAPH), ["Elena-hermano-Marcos", "Elena-rival-Iván", "Elena-amiga-Lucía", "Marcos-rival-Iván"]);
	assert.deepEqual(relationTypes(GRAPH), ["amiga", "hermano", "rival"]);
});

test("el filtro por tipo oculta el resto", () => {
	assert.deepEqual(pairs(filterGraph(GRAPH, { tipo: "rival" })), ["Elena-rival-Iván", "Marcos-rival-Iván"]);
	assert.equal(filterGraph(GRAPH, { tipo: "rival" }).nodes.length, 4);
});

test("el filtro por capítulo solo deja relaciones vigentes en N", () => {
	assert.equal(chapterNumber("[[Cap 07]]"), 7);
	assert.equal(chapterNumber("[[Prólogo]]"), null);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 1 })), ["Elena-hermano-Marcos", "Marcos-rival-Iván"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 5 })), ["Elena-hermano-Marcos", "Elena-amiga-Lucía"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 7 })), ["Elena-hermano-Marcos", "Elena-rival-Iván"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { tipo: "rival", capitulo: 3 })), ["Marcos-rival-Iván"]);
});

test("el círculo coloca cada nodo dentro del lienzo", () => {
	const placed = circleLayout(GRAPH.nodes, 400);
	assert.equal(placed.length, 4);
	assert.deepEqual(placed[0], { name: "Elena", x: 200, y: 48 });
	for (const node of placed) {
		assert.ok(node.x >= 0 && node.x <= 400 && node.y >= 0 && node.y <= 400);
	}
});
