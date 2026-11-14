import assert from "node:assert/strict";
import test from "node:test";

import { buildEntityIndex, mentions, projectOf } from "../src/entities.ts";

const ELENA = `---
tipo: personaje
nombre: "Elena Ruiz"
alias: [la Doctora, Ele]
relaciones: []
---
`;
const FARO = `---
tipo: lugar
nombre: "El Faro"
padre:
estados: []
---
`;
const REVOLVER = `---
tipo: objeto
nombre: "Revólver"
posesiones: []
---
`;

function vault(scenes) {
	return [
		{ path: "Novela/Personajes/Elena.md", text: ELENA },
		{ path: "Novela/Lugares/Faro.md", text: FARO },
		{ path: "Novela/Objetos/Revólver.md", text: REVOLVER },
		{ path: "Otra/Personajes/Intrusa.md", text: ELENA },
		{ path: "Otra/Manuscrito/Cap 01.md", text: "Elena llega." },
		...scenes,
	];
}

test("el índice lista personajes, lugares y objetos del proyecto", () => {
	const index = buildEntityIndex("Novela", vault([]));
	assert.deepEqual(
		index.map((entry) => [entry.tipo, entry.nombre, entry.path, entry.escenas]),
		[
			["personaje", "Elena Ruiz", "Novela/Personajes/Elena.md", []],
			["lugar", "El Faro", "Novela/Lugares/Faro.md", []],
			["objeto", "Revólver", "Novela/Objetos/Revólver.md", []],
		],
	);
});

test("cada ficha lista las escenas que la nombran por nombre o alias", () => {
	const index = buildEntityIndex(
		"Novela",
		vault([
			{ path: "Novela/Manuscrito/Cap 01.md", text: "La Doctora sube al faro." },
			{ path: "Novela/Manuscrito/Cap 02.md", text: "—Ele, ven —dijo. Lleva el revólver." },
			{ path: "Novela/Manuscrito/Cap 03.md", text: "Elena Ruiz duerme en El Faro." },
			{ path: "Novela/Manuscrito/Cap 04.md", text: "Elegante y sola, nadie habla." },
		]),
	);
	const byName = Object.fromEntries(index.map((entry) => [entry.nombre, entry.escenas]));
	assert.deepEqual(byName["Elena Ruiz"], [
		"Novela/Manuscrito/Cap 01.md",
		"Novela/Manuscrito/Cap 02.md",
		"Novela/Manuscrito/Cap 03.md",
	]);
	assert.deepEqual(byName["El Faro"], ["Novela/Manuscrito/Cap 03.md"]);
	assert.deepEqual(byName["Revólver"], ["Novela/Manuscrito/Cap 02.md"]);
});

test("re-escanear actualiza apariciones sin duplicar entradas", () => {
	const scene = { path: "Novela/Manuscrito/Cap 01.md", text: "Ele y la Doctora: Elena Ruiz, tres veces." };
	const first = buildEntityIndex("Novela", vault([scene]));
	const again = buildEntityIndex("Novela", vault([scene]));
	assert.deepEqual(again, first);
	assert.equal(first.length, 3);
	assert.deepEqual(first[0].escenas, ["Novela/Manuscrito/Cap 01.md"]);

	const edited = buildEntityIndex("Novela", vault([{ ...scene, text: "Nadie aquí." }]));
	assert.deepEqual(edited[0].escenas, []);
});

test("dos alias del mismo personaje cuentan como el mismo personaje", () => {
	const index = buildEntityIndex(
		"Novela",
		vault([
			{ path: "Novela/Manuscrito/Cap 01.md", text: "la doctora entra." },
			{ path: "Novela/Manuscrito/Cap 02.md", text: "ELE sale." },
		]),
	);
	const elena = index.filter((entry) => entry.tipo === "personaje");
	assert.equal(elena.length, 1);
	assert.deepEqual(elena[0].alias, ["la Doctora", "Ele"]);
	assert.deepEqual(elena[0].escenas, ["Novela/Manuscrito/Cap 01.md", "Novela/Manuscrito/Cap 02.md"]);
});

test("las menciones son palabras completas y sin ficha usa el título de la nota", () => {
	assert.equal(mentions("Elegante.", ["Ele"]), false);
	assert.equal(mentions("¿Ele?", ["Ele"]), true);
	assert.equal(mentions("Ana (sic) [x]", ["(sic)"]), true);
	assert.equal(mentions("texto", ["", "  "]), false);
	const index = buildEntityIndex("", [
		{ path: "Personajes/Marcos.md", text: "Sin ficha." },
		{ path: "Manuscrito/Cap 01.md", text: "Marcos mira." },
	]);
	assert.deepEqual(index, [
		{ tipo: "personaje", nombre: "Marcos", alias: [], path: "Personajes/Marcos.md", escenas: ["Manuscrito/Cap 01.md"] },
	]);
});

test("el proyecto sale de la nota activa", () => {
	assert.equal(projectOf("Novela/Manuscrito/Cap 01.md"), "Novela");
	assert.equal(projectOf("Novela/Lugares/Faro.md"), "Novela");
	assert.equal(projectOf("Sagas/Novela/Personajes/Elena.md"), "Sagas/Novela");
	assert.equal(projectOf("Novela/Novela.md"), "Novela");
	assert.equal(projectOf("Personajes/Elena.md"), "");
	assert.equal(projectOf(""), "");
});
