import assert from "node:assert/strict";
import test from "node:test";

import { parseCharacter } from "../src/characters.ts";
import { parseObject } from "../src/objects.ts";
import { parsePlace } from "../src/places.ts";
import { worldAt } from "../src/world.ts";

const ELENA = parseCharacter(`---
tipo: personaje
nombre: "Elena"
alias: []
relaciones:
  - con: "[[Marcos]]"
    tipo: "aliado"
    desde: "[[Cap 03]]"
    hasta: "[[Cap 10]]"
  - con: "[[Marcos]]"
    tipo: "enemigo"
    desde: "[[Cap 10]]"
  - con: "[[Abuelo]]"
    tipo: "nieta"
---
`);

const REVOLVER = parseObject(`---
tipo: objeto
nombre: "Revólver del abuelo"
posesiones:
  - poseedor: "[[Abuelo]]"
    capitulo: "[[Cap 01]]"
  - poseedor: "[[Elena]]"
    capitulo: "[[Cap 04]]"
---
`);

const CARTA = parseObject(`---
tipo: objeto
nombre: "Carta"
posesiones:
  - poseedor: "[[Marcos]]"
    capitulo: "[[Cap 08]]"
---
`);

const CASA = parsePlace(`---
tipo: lugar
nombre: "Casa del abuelo"
padre: "[[Pueblo]]"
estados:
  - capitulo: "[[Cap 02]]"
    descripcion: "Habitada"
  - capitulo: "[[Cap 12]]"
    descripcion: "Quemada"
---
`);

const FARO = parsePlace(`---
tipo: lugar
nombre: "Faro"
estados:
  - capitulo: "[[Cap 09]]"
    descripcion: "Abandonado"
---
`);

const SHEETS = { personajes: [ELENA], objetos: [REVOLVER, CARTA], lugares: [CASA, FARO] };

test("devuelve las relaciones vigentes en el capítulo N", () => {
	assert.deepEqual(worldAt(SHEETS, 2).relaciones, [
		{ personaje: "Elena", con: "[[Abuelo]]", tipo: "nieta" },
	]);
	assert.deepEqual(worldAt(SHEETS, 5).relaciones, [
		{ personaje: "Elena", con: "[[Marcos]]", tipo: "aliado" },
		{ personaje: "Elena", con: "[[Abuelo]]", tipo: "nieta" },
	]);
	assert.deepEqual(worldAt(SHEETS, 10).relaciones, [
		{ personaje: "Elena", con: "[[Marcos]]", tipo: "enemigo" },
		{ personaje: "Elena", con: "[[Abuelo]]", tipo: "nieta" },
	]);
});

test("incluye el poseedor de cada objeto rastreado en N", () => {
	assert.deepEqual(worldAt(SHEETS, 3).posesiones, [
		{ objeto: "Revólver del abuelo", poseedor: "[[Abuelo]]" },
	]);
	assert.deepEqual(worldAt(SHEETS, 8).posesiones, [
		{ objeto: "Revólver del abuelo", poseedor: "[[Elena]]" },
		{ objeto: "Carta", poseedor: "[[Marcos]]" },
	]);
});

test("incluye el estado de cada lugar con un cambio en o antes de N", () => {
	assert.deepEqual(worldAt(SHEETS, 1).lugares, []);
	assert.deepEqual(worldAt(SHEETS, 9).lugares, [
		{ lugar: "Casa del abuelo", estado: "Habitada", desde: "[[Cap 02]]" },
		{ lugar: "Faro", estado: "Abandonado", desde: "[[Cap 09]]" },
	]);
	assert.deepEqual(worldAt(SHEETS, 15).lugares, [
		{ lugar: "Casa del abuelo", estado: "Quemada", desde: "[[Cap 12]]" },
		{ lugar: "Faro", estado: "Abandonado", desde: "[[Cap 09]]" },
	]);
});

test("bordes: empate en el mismo capítulo, orden libre, capítulo ilegible y poseedor vacío", () => {
	const sheets = {
		personajes: [
			{ nombre: "Marcos", relaciones: [{ con: "[[Elena]]", tipo: "rival", hasta: "[[Cap 04]]" }] },
		],
		objetos: [
			{
				nombre: "Llave",
				posesiones: [
					{ poseedor: "[[Elena]]", capitulo: "[[Cap 06]]" },
					{ poseedor: "[[Abuelo]]", capitulo: "[[Cap 02]]" },
					{ poseedor: "[[Marcos]]", capitulo: "[[Cap 06]]" },
					{ poseedor: "[[Nadie]]", capitulo: "[[Epílogo]]" },
				],
			},
			{ nombre: "Anillo", posesiones: [{ poseedor: "", capitulo: "[[Cap 01]]" }] },
		],
		lugares: [
			{
				nombre: "Puerto",
				estados: [
					{ capitulo: "[[Cap 05]]", descripcion: "Cerrado" },
					{ capitulo: "[[Cap 05]]", descripcion: "Reabierto" },
				],
			},
		],
	};
	assert.deepEqual(worldAt(sheets, 3).relaciones, [{ personaje: "Marcos", con: "[[Elena]]", tipo: "rival" }]);
	assert.deepEqual(worldAt(sheets, 4).relaciones, []);
	assert.deepEqual(worldAt(sheets, 5).posesiones, [{ objeto: "Llave", poseedor: "[[Abuelo]]" }]);
	assert.deepEqual(worldAt(sheets, 6).posesiones, [{ objeto: "Llave", poseedor: "[[Marcos]]" }]);
	assert.deepEqual(worldAt(sheets, 5).lugares, [{ lugar: "Puerto", estado: "Reabierto", desde: "[[Cap 05]]" }]);
	assert.deepEqual(worldAt(sheets, 0), {
		relaciones: [{ personaje: "Marcos", con: "[[Elena]]", tipo: "rival" }],
		posesiones: [],
		lugares: [],
	});
});
