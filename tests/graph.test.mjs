import assert from "node:assert/strict";
import test from "node:test";

import { characterFolder } from "../src/characters.ts";
import { holderAt } from "../src/objects.ts";
import { worldAt } from "../src/world.ts";
import { buildGraph, chapterNumber, circleLayout, filterGraph, linkTarget, projectCharacterPaths, relationTypes } from "../src/graph.ts";

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
	assert.equal(chapterNumber("[[Cap 07 - parte 2]]"), 7);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 1 })), ["Elena-hermano-Marcos", "Marcos-rival-Iván"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 4 })), ["Elena-hermano-Marcos", "Elena-amiga-Lucía"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 5 })), ["Elena-hermano-Marcos"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { capitulo: 7 })), ["Elena-hermano-Marcos", "Elena-rival-Iván"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { tipo: "rival", capitulo: 2 })), ["Marcos-rival-Iván"]);
	assert.deepEqual(pairs(filterGraph(GRAPH, { tipo: "rival", capitulo: 3 })), []);
});

test("el círculo coloca cada nodo dentro del lienzo", () => {
	const placed = circleLayout(GRAPH.nodes, 400);
	assert.equal(placed.length, 4);
	assert.deepEqual(placed[0], { name: "Elena", x: 200, y: 48 });
	for (const node of placed) {
		assert.ok(node.x >= 0 && node.x <= 400 && node.y >= 0 && node.y <= 400);
	}
});

test("los enlaces con alias, encabezado o sin corchetes apuntan a la ficha", () => {
	assert.equal(linkTarget("[[Marcos#Infancia|el hermano]]"), "Marcos");
	assert.equal(linkTarget("  Marcos  "), "Marcos");
	const graph = buildGraph([{ name: "Elena", relaciones: [{ con: "[[]]", tipo: "rival" }, { con: "Marcos", tipo: "hermano" }] }]);
	assert.deepEqual(pairs(graph), ["Elena-hermano-Marcos"]);
});

test("el grafo y Mundo leen igual las mismas fichas: `hasta` cierra antes de ese capítulo", () => {
	const relaciones = [
		{ con: "[[Iván]]", tipo: "aliado", hasta: "[[Cap 10]]" },
		{ con: "[[Iván]]", tipo: "enemigo", desde: "[[Cap 10]]" },
		{ con: "[[Lucía]]", tipo: "amiga", desde: "[[Libro 2/Cap 07]]" },
	];
	const graph = buildGraph([{ name: "Elena", relaciones }]);
	const sheets = { personajes: [{ nombre: "Elena", relaciones }], objetos: [], lugares: [] };
	for (const capitulo of [6, 7, 9, 10, 11]) {
		const inGraph = filterGraph(graph, { capitulo }).edges.map((edge) => edge.tipo);
		const inWorld = worldAt(sheets, capitulo).relaciones.map((relation) => relation.tipo);
		assert.deepEqual(inGraph, inWorld, `capítulo ${capitulo}`);
	}
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 9 })), ["Elena-aliado-Iván", "Elena-amiga-Lucía"]);
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 10 })), ["Elena-enemigo-Iván", "Elena-amiga-Lucía"]);
});

test("un límite sin número de capítulo queda abierto", () => {
	const graph = buildGraph([{ name: "Elena", relaciones: [{ con: "[[Iván]]", tipo: "rival", desde: "[[Prólogo]]" }] }]);
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 1 })), ["Elena-rival-Iván"]);
});

test("sin filtro, o con tipo vacío, se ven todas las aristas", () => {
	assert.equal(filterGraph(GRAPH, {}).edges.length, 4);
	assert.equal(filterGraph(GRAPH, { tipo: "" }).edges.length, 4);
});

test("el círculo centra un nodo solo y no falla sin nodos", () => {
	assert.deepEqual(circleLayout(["Elena"], 400), [{ name: "Elena", x: 200, y: 200 }]);
	assert.deepEqual(circleLayout([], 400), []);
});

test("un enlace con carpeta apunta a la ficha, no a un nodo fantasma", () => {
	assert.equal(linkTarget("[[Novela/Personajes/Marcos|el hermano]]"), "Marcos");
	assert.equal(chapterNumber("[[Novela/Manuscrito/Cap 07]]"), 7);
	const graph = buildGraph([
		{ name: "Elena", relaciones: [{ con: "[[Personajes/Marcos]]", tipo: "hermano" }] },
		{ name: "Marcos", relaciones: [] },
	]);
	assert.deepEqual(graph.nodes, ["Elena", "Marcos"]);
	assert.deepEqual(pairs(graph), ["Elena-hermano-Marcos"]);
});

test("el grafo solo lee las fichas del proyecto activo", () => {
	const paths = [
		"Novela/Personajes/Elena.md",
		"Novela/Personajes/Marcos.md",
		"Otra/Personajes/Elena.md",
		"Personajes/Suelta.md",
		"Novela/Manuscrito/Cap 01.md",
	];
	const forActive = (active) => projectCharacterPaths(paths, characterFolder(active));
	assert.deepEqual(forActive("Novela/Manuscrito/Cap 01.md"), ["Novela/Personajes/Elena.md", "Novela/Personajes/Marcos.md"]);
	assert.deepEqual(forActive("Otra/Personajes/Elena.md"), ["Otra/Personajes/Elena.md"]);
	assert.deepEqual(forActive(""), ["Personajes/Suelta.md"]);
});

test("un proyecto con nombre parecido no se cuela en el grafo", () => {
	const paths = ["Novela/Personajes/Elena.md", "Novela/Personajes2/Iván.md", "Novela/Personajes/Secundarios/Lucía.md", "OtraNovela/Personajes/Marcos.md"];
	assert.deepEqual(projectCharacterPaths(paths, "Novela/Personajes"), ["Novela/Personajes/Elena.md"]);
});

test("el capítulo sale de la nota del enlace, no de la carpeta ni de la escena", () => {
	assert.equal(chapterNumber("[[Libro 2/Cap 07]]"), 7);
	assert.equal(chapterNumber("[[Cap 07 - escena 3|parte 2]]"), 7);
	const graph = buildGraph([{ name: "Elena", relaciones: [{ con: "[[Iván]]", tipo: "rival", desde: "[[Libro 2/Cap 07 - parte 3]]" }] }]);
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 2 })), []);
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 3 })), []);
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 6 })), []);
	assert.deepEqual(pairs(filterGraph(graph, { capitulo: 7 })), ["Elena-rival-Iván"]);
});

test("objetos leen el capítulo con el mismo helper: `[[Libro 2/Cap 07]]` es el 7", () => {
	const sheet = { nombre: "Llave", posesiones: [{ poseedor: "[[Elena]]", capitulo: "[[Libro 2/Cap 07]]" }] };
	assert.equal(holderAt(sheet, 6), "");
	assert.equal(holderAt(sheet, 7), "[[Elena]]");
});
