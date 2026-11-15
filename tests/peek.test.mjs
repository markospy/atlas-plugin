import assert from "node:assert/strict";
import test from "node:test";

import { parseCharacter } from "../src/characters.ts";
import { parseObject } from "../src/objects.ts";
import { parsePlace } from "../src/places.ts";
import { chapterOf, entityAt, isSheetPath, peekAt, projectSheets } from "../src/peek.ts";

const ENTITIES = [
	{ tipo: "personaje", nombre: "Elena", alias: ["la nieta"], path: "Novela/Personajes/Elena.md", escenas: [] },
	{ tipo: "personaje", nombre: "Marcos", alias: [], path: "Novela/Personajes/Marcos.md", escenas: [] },
	{ tipo: "objeto", nombre: "Revólver", alias: [], path: "Novela/Objetos/Revólver.md", escenas: [] },
	{ tipo: "lugar", nombre: "Casa del abuelo", alias: [], path: "Novela/Lugares/Casa del abuelo.md", escenas: [] },
];

const SHEETS = {
	personajes: [
		parseCharacter(`---
tipo: personaje
nombre: "Elena"
relaciones:
  - con: "[[Marcos]]"
    tipo: "aliado"
    desde: "[[Cap 03]]"
    hasta: "[[Cap 10]]"
  - con: "[[Marcos]]"
    tipo: "enemigo"
    desde: "[[Cap 10]]"
---
`),
	],
	objetos: [
		parseObject(`---
tipo: objeto
nombre: "Revólver"
posesiones:
  - poseedor: "[[Abuelo]]"
    capitulo: "[[Cap 01]]"
  - poseedor: "[[Elena]]"
    capitulo: "[[Cap 04]]"
---
`),
	],
	lugares: [
		parsePlace(`---
tipo: lugar
nombre: "Casa del abuelo"
estados:
  - capitulo: "[[Cap 02]]"
    descripcion: "Habitada"
  - capitulo: "[[Cap 12]]"
    descripcion: "Quemada"
---
`),
	],
};

test("entityAt encuentra la mención bajo el cursor, por nombre o alias", () => {
	const line = "Entonces la nieta miró a Marcos.";
	assert.equal(entityAt(line, line.indexOf("Marcos") + 2, ENTITIES)?.nombre, "Marcos");
	assert.equal(entityAt(line, line.indexOf("nieta"), ENTITIES)?.nombre, "Elena");
	// Cursor right after the last letter still counts as on the word.
	assert.equal(entityAt(line, line.indexOf("Marcos") + 6, ENTITIES)?.nombre, "Marcos");
	assert.equal(entityAt(line, 0, ENTITIES), null);
});

test("entityAt reconoce enlaces y nombres de varias palabras sin distinguir mayúsculas", () => {
	const line = "Llegaron a [[Casa del abuelo]] de noche; la casa del abuelo olía a humo.";
	assert.equal(entityAt(line, line.indexOf("abuelo]]"), ENTITIES)?.nombre, "Casa del abuelo");
	assert.equal(entityAt(line, line.indexOf("la casa") + 5, ENTITIES)?.nombre, "Casa del abuelo");
});

test("peekAt da el estado del personaje en el capítulo de la nota", () => {
	const line = "Marcos sacó el arma.";
	const early = peekAt(line, 1, ENTITIES, SHEETS, 5);
	assert.equal(early.ok, true);
	assert.equal(early.entidad.nombre, "Marcos");
	assert.deepEqual(early.estado, ["Relación: Elena → aliado"]);
	const late = peekAt(line, 1, ENTITIES, SHEETS, 11);
	assert.deepEqual(late.estado, ["Relación: Elena → enemigo"]);

	const elena = peekAt("Elena", 0, ENTITIES, SHEETS, 5);
	assert.deepEqual(elena.estado, ["Relación: aliado de Marcos", "Posee: Revólver"]);
});

test("peekAt da poseedor del objeto y estado del lugar en ese capítulo", () => {
	assert.deepEqual(peekAt("el Revólver", 4, ENTITIES, SHEETS, 2).estado, ["Poseedor: Abuelo"]);
	assert.deepEqual(peekAt("el Revólver", 4, ENTITIES, SHEETS, 4).estado, ["Poseedor: Elena"]);
	assert.deepEqual(peekAt("Casa del abuelo", 0, ENTITIES, SHEETS, 12).estado, ["Estado: Quemada (desde Cap 12)"]);
	assert.deepEqual(peekAt("Casa del abuelo", 0, ENTITIES, SHEETS, 1).estado, []);
});

test("peekAt sin coincidencia lo indica sin lanzar", () => {
	assert.deepEqual(peekAt("Nadie conocido aquí.", 3, ENTITIES, SHEETS, 5), { ok: false });
	assert.deepEqual(peekAt("", 0, [], { personajes: [], objetos: [], lugares: [] }, 5), { ok: false });
});

test("entityAt: gana la coincidencia más larga aunque la corta venga después", () => {
	const entities = [
		{ tipo: "lugar", nombre: "Casa del abuelo", alias: [], path: "Novela/Lugares/Casa del abuelo.md", escenas: [] },
		{ tipo: "lugar", nombre: "Casa", alias: [], path: "Novela/Lugares/Casa.md", escenas: [] },
	];
	assert.equal(entityAt("la casa del abuelo", 4, entities)?.nombre, "Casa del abuelo");
	assert.equal(entityAt("la casa vieja", 4, entities)?.nombre, "Casa");
});

test("entityAt: solo palabra completa y el cursor fuera de la mención no cuenta", () => {
	const line = "Elenas y a Marcos";
	assert.equal(entityAt(line, 1, ENTITIES), null);
	// Column just before the match start (the space) is outside the word.
	assert.equal(entityAt(line, line.indexOf("Marcos") - 1, ENTITIES), null);
	assert.equal(entityAt(line, line.indexOf("Marcos"), ENTITIES)?.nombre, "Marcos");
});

test("peekAt sin capítulo devuelve la entidad sin estado", () => {
	const found = peekAt("Elena", 0, ENTITIES, SHEETS, null);
	assert.equal(found.ok, true);
	assert.deepEqual(found.estado, []);
});

test("projectSheets: ficha sin nombre usa el título de la nota y muestra su estado", () => {
	const notes = [
		{ path: "Novela/Personajes/Elena.md", text: "---\ntipo: personaje\n---\n" },
		{
			path: "Novela/Objetos/Revólver.md",
			text: '---\ntipo: objeto\nposesiones:\n  - poseedor: "[[Elena]]"\n    capitulo: "[[Cap 04]]"\n---\n',
		},
		{ path: "Novela/Lugares/Faro.md", text: '---\ntipo: lugar\nestados:\n  - capitulo: "[[Cap 02]]"\n    descripcion: "Apagado"\n---\n' },
		{ path: "Otra/Personajes/Ajeno.md", text: "---\ntipo: personaje\n---\n" },
	];
	const { entities, sheets } = projectSheets("Novela", notes);
	assert.deepEqual(entities.map((entity) => entity.nombre), ["Elena", "Faro", "Revólver"]);
	assert.deepEqual(peekAt("el Revólver", 4, entities, sheets, 5).estado, ["Poseedor: Elena"]);
	assert.deepEqual(peekAt("Elena", 0, entities, sheets, 5).estado, ["Posee: Revólver"]);
	assert.deepEqual(peekAt("el Faro", 4, entities, sheets, 3).estado, ["Estado: Apagado (desde Cap 02)"]);
});

test("chapterOf: capítulo de la nota por su nombre o su carpeta", () => {
	assert.equal(chapterOf("Novela/Manuscrito/Cap 03/escena.md"), 3);
	assert.equal(chapterOf("Novela/Manuscrito/Cap 03.md"), 3);
	assert.equal(chapterOf("Novela/Manuscrito/borrador.md"), null);
});

test("isSheetPath: solo fichas del proyecto, no escenas ni otros proyectos", () => {
	assert.equal(isSheetPath("Novela", "Novela/Personajes/Elena.md"), true);
	assert.equal(isSheetPath("Novela", "Novela/Manuscrito/Cap 03.md"), false);
	assert.equal(isSheetPath("Novela", "Otra/Personajes/Elena.md"), false);
	assert.equal(isSheetPath("", "Personajes/Elena.md"), true);
	assert.equal(isSheetPath("", "Manuscrito/Cap 01.md"), false);
});

test("entityAt: nombres con signos de regex y cursor sobre la segunda aparición", () => {
	const entities = [
		{ tipo: "personaje", nombre: "Dr. Ruiz (padre)", alias: ["", "  "], path: "Novela/Personajes/Ruiz.md", escenas: [] },
		{ tipo: "personaje", nombre: "Ana", alias: [], path: "Novela/Personajes/Ana.md", escenas: [] },
	];
	const line = "Dr. Ruiz (padre) habló con Ana; luego Ana calló.";
	assert.equal(entityAt(line, 5, entities)?.nombre, "Dr. Ruiz (padre)");
	assert.equal(entityAt(line, line.lastIndexOf("Ana") + 1, entities)?.nombre, "Ana");
	// Blank aliases never match empty text.
	assert.equal(entityAt("   ", 1, entities), null);
});

test("chapterOf: nota en la raíz y formatos Cap.7 / cap 12", () => {
	assert.equal(chapterOf("Cap 05.md"), 5);
	assert.equal(chapterOf("Novela/Manuscrito/Cap.7/escena.md"), 7);
	assert.equal(chapterOf("Novela/Manuscrito/cap 12 - final.md"), 12);
	assert.equal(chapterOf("escena.md"), null);
});

test("projectSheets: ignora escenas del manuscrito aunque tengan tipo de ficha", () => {
	const notes = [
		{ path: "Novela/Personajes/Elena.md", text: '---\ntipo: personaje\nnombre: "Elena"\n---\n' },
		{ path: "Novela/Manuscrito/Cap 01/Elena.md", text: "---\ntipo: personaje\n---\n" },
	];
	const { entities, sheets } = projectSheets("Novela", notes);
	assert.deepEqual(entities.map((entity) => entity.path), ["Novela/Personajes/Elena.md"]);
	assert.equal(sheets.personajes.length, 1);
});

test("peekAt: ficha con nombre distinto del archivo casa con enlaces al archivo", () => {
	const notes = [
		{ path: "Novela/Personajes/Ana.md", text: '---\ntipo: personaje\nnombre: "Ana García"\n---\n' },
		{
			path: "Novela/Personajes/Luis.md",
			text: '---\ntipo: personaje\nnombre: "Luis"\nrelaciones:\n  - con: "[[Ana]]"\n    tipo: "hermano"\n---\n',
		},
		{
			path: "Novela/Objetos/Llave.md",
			text: '---\ntipo: objeto\nposesiones:\n  - poseedor: "[[Personajes/Ana|la hermana]]"\n    capitulo: "[[Cap 01]]"\n---\n',
		},
	];
	const { entities, sheets } = projectSheets("Novela", notes);
	assert.deepEqual(peekAt("Ana García", 0, entities, sheets, 2).estado, ["Relación: Luis → hermano", "Posee: Llave"]);
});
