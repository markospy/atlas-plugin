import assert from "node:assert/strict";
import test from "node:test";

import { parseCharacter } from "../src/characters.ts";
import { parseObject } from "../src/objects.ts";
import { parsePlace } from "../src/places.ts";
import { entityAt, peekAt } from "../src/peek.ts";

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
	assert.deepEqual(peekAt("Casa del abuelo", 0, ENTITIES, SHEETS, 12).estado, ["Estado: Quemada (desde [[Cap 12]])"]);
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
