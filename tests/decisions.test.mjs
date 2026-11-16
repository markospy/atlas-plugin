import assert from "node:assert/strict";
import test from "node:test";

import { addDecision, markAligned, parseDecisions, pendingChapters } from "../src/decisions.ts";

const scene = (path, text) => ({ path: `Novela/Manuscrito/${path}`, text });

const SCENES = [
	scene("Cap 02.md", "Llegaron a la posada del Ciervo al anochecer."),
	scene("Cap 04/Escena 1.md", "Nadie habló en la Posada del Ciervo."),
	scene("Cap 04/Escena 2.md", "El camino seguía."),
	scene("Cap 05.md", "Volvieron a la posada; el ciervo dormía en el establo."),
	scene("Cap 07.md", "La posada del Ciervo ya no existía en sus recuerdos."),
	scene("Cap 09.md", "Entraron en El Reyezuelo."),
	{ path: "Novela/Personajes/Elena.md", text: "Trabaja en la posada del Ciervo." },
	{ path: "Otra/Manuscrito/Cap 01.md", text: "La posada del Ciervo de otra novela." },
];

// docs/historial-chat.md § 3.5: «la posada se llama El Reyezuelo» desde el cap. 7.
test("rename de lugar: lista solo capítulos anteriores al corte que aún nombran el valor antiguo", () => {
	const [decision] = addDecision([], { antiguo: "posada del Ciervo", nuevo: "El Reyezuelo", desde: 7 });
	assert.deepEqual(decision, { id: "d1", antiguo: "posada del Ciervo", nuevo: "El Reyezuelo", desde: 7, alineados: [] });
	assert.deepEqual(pendingChapters("Novela", decision, SCENES), [
		{ capitulo: 2, escenas: ["Novela/Manuscrito/Cap 02.md"] },
		{ capitulo: 4, escenas: ["Novela/Manuscrito/Cap 04/Escena 1.md"] },
	]);
});

test("marcar un capítulo como alineado lo quita de la lista, sin tocar los demás", () => {
	const [decision] = addDecision([], { antiguo: "posada del Ciervo", nuevo: "El Reyezuelo", desde: 7 });
	const aligned = markAligned(decision, 2);
	assert.deepEqual(aligned.alineados, [2]);
	assert.deepEqual(decision.alineados, []);
	assert.deepEqual(
		pendingChapters("Novela", aligned, SCENES).map((entry) => entry.capitulo),
		[4],
	);
	assert.deepEqual(markAligned(aligned, 2).alineados, [2]);
	assert.deepEqual(pendingChapters("Novela", markAligned(aligned, 4), SCENES), []);
});

test("un capítulo alineado que vuelve a nombrar el valor antiguo sigue fuera: la marca es del escritor", () => {
	const [decision] = addDecision([], { antiguo: "posada del Ciervo", nuevo: "El Reyezuelo", desde: 7 });
	assert.deepEqual(pendingChapters("Novela", markAligned(decision, 4), SCENES).map((entry) => entry.capitulo), [2]);
});

test("varias decisiones llevan id propio y se validan", () => {
	const first = addDecision([], { antiguo: "Ciervo", nuevo: "Reyezuelo", desde: 7 });
	const both = addDecision(first, { antiguo: " Elena ", nuevo: " Helena ", desde: 3 });
	assert.deepEqual(
		both.map((decision) => [decision.id, decision.antiguo, decision.nuevo, decision.desde]),
		[
			["d1", "Ciervo", "Reyezuelo", 7],
			["d2", "Elena", "Helena", 3],
		],
	);
	assert.throws(() => addDecision([], { antiguo: "", nuevo: "B", desde: 3 }), /valor antiguo/);
	assert.throws(() => addDecision([], { antiguo: "A", nuevo: " ", desde: 3 }), /valor nuevo/);
	assert.throws(() => addDecision([], { antiguo: "A", nuevo: "A", desde: 3 }), /distinto/);
	assert.throws(() => addDecision([], { antiguo: "A", nuevo: "B", desde: 0 }), /capítulo de corte/);
	assert.throws(() => addDecision([], { antiguo: "A", nuevo: "B", desde: 2.5 }), /capítulo de corte/);
});

test("el almacén vacío o ausente arranca sin decisiones", () => {
	assert.deepEqual(parseDecisions(null), { decisiones: {} });
	assert.deepEqual(parseDecisions("{}"), { decisiones: {} });
	const stored = { decisiones: { Novela: [{ id: "d1", antiguo: "a", nuevo: "b", desde: 2, alineados: [1] }] } };
	assert.deepEqual(parseDecisions(JSON.stringify(stored)), stored);
});

test("el capítulo justo antes del corte entra, con todas sus escenas en orden numérico", () => {
	const [decision] = addDecision([], { antiguo: "posada del Ciervo", nuevo: "El Reyezuelo", desde: 7 });
	const notes = [
		scene("Cap 06/Escena 10.md", "Otra vez la posada del ciervo."),
		scene("Cap 06/Escena 2.md", "La POSADA DEL CIERVO cerraba tarde."),
		scene("Cap 06/Escena 3.md", "Sin mención."),
		scene("Prologo.md", "La posada del Ciervo, sin capítulo."),
	];
	assert.deepEqual(pendingChapters("Novela", decision, notes), [
		{ capitulo: 6, escenas: ["Novela/Manuscrito/Cap 06/Escena 2.md", "Novela/Manuscrito/Cap 06/Escena 10.md"] },
	]);
});
