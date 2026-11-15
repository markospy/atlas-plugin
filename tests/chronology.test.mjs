import assert from "node:assert/strict";
import test from "node:test";

import { impossibleTravels, parseSceneTime, parseTravels } from "../src/chronology.ts";
import { placeNote } from "../src/places.ts";

const CASA = `---
tipo: lugar
nombre: "Casa de Elena"
viajes:
  - a: "[[Puerto]]"
    dias: 7
  - a: "[[Mercado]]"
    dias: 0.5
---
`;

const scene = (nombre, dia, lugar, personajes) => ({ nombre, dia, lugar, personajes });

test("una escena declara día, lugar y personajes; sin día no entra en la cronología", () => {
	const note = `---
dia: 3
lugar: "[[Casa de Elena]]"
pov: "[[Elena]]"
personajes: ["[[Marcos]]"]
---
Texto.
`;
	assert.deepEqual(parseSceneTime("Cap 01", note), {
		nombre: "Cap 01",
		dia: 3,
		lugar: "Casa de Elena",
		personajes: ["Elena", "Marcos"],
	});
	assert.equal(parseSceneTime("Cap 02", "---\nlugar: Puerto\n---\n"), null);
	assert.equal(parseSceneTime("Cap 03", "---\ndia: pronto\nlugar: Puerto\n---\n"), null);
	assert.equal(parseSceneTime("Cap 04", "Sin frontmatter."), null);
});

test("un lugar declara la duración mínima de sus viajes", () => {
	assert.deepEqual(parseTravels(CASA), [
		{ desde: "Casa de Elena", a: "Puerto", dias: 7 },
		{ desde: "Casa de Elena", a: "Mercado", dias: 0.5 },
	]);
	assert.deepEqual(parseTravels(placeNote("Cocina")), []);
	assert.match(placeNote("Cocina"), /^viajes: \[\]$/m);
});

test("un viaje demasiado corto sale como par de escenas imposible, en los dos sentidos", () => {
	const travels = parseTravels(CASA);
	const scenes = [
		scene("Cap 01", 1, "Casa de Elena", ["Elena"]),
		scene("Cap 02", 3, "Puerto", ["Elena"]),
		scene("Cap 03", 20, "Puerto", ["Elena"]),
		scene("Cap 04", 22, "Casa de Elena", ["Elena"]),
	];
	assert.deepEqual(impossibleTravels(scenes, travels), [
		{ personaje: "Elena", desde: "Cap 01", hasta: "Cap 02", origen: "Casa de Elena", destino: "Puerto", dias: 2, minimo: 7 },
		{ personaje: "Elena", desde: "Cap 03", hasta: "Cap 04", origen: "Puerto", destino: "Casa de Elena", dias: 2, minimo: 7 },
	]);
});

test("un viaje con tiempo suficiente, sin ruta declarada o de otro personaje no avisa", () => {
	const travels = parseTravels(CASA);
	assert.deepEqual(
		impossibleTravels(
			[
				scene("Cap 01", 1, "Casa de Elena", ["Elena"]),
				scene("Cap 02", 8, "Puerto", ["Elena"]),
				scene("Cap 03", 8, "Puerto", ["Marcos"]),
				scene("Cap 04", 9, "Faro", ["Marcos"]),
				scene("Cap 05", 9, "Puerto", ["Marcos"]),
				scene("Cap 06", 9.5, "Puerto", ["Elena"]),
			],
			travels,
		),
		[],
	);
});

test("los pares se comparan por día, no por orden de capítulo", () => {
	const travels = parseTravels(CASA);
	assert.deepEqual(
		impossibleTravels(
			[scene("Cap 09", 6, "Mercado", ["Elena"]), scene("Cap 02", 5.75, "Casa de Elena", ["Elena"])],
			travels,
		).map(({ desde, hasta, dias }) => [desde, hasta, dias]),
		[["Cap 02", "Cap 09", 0.25]],
	);
});

test("con dos rutas declaradas entre los mismos lugares manda la más corta; un lugar sin nombre no declara viajes", () => {
	const travels = [...parseTravels(CASA), { desde: "Puerto", a: "Casa de Elena", dias: 2 }];
	assert.deepEqual(
		impossibleTravels([scene("Cap 01", 1, "Casa de Elena", ["Elena"]), scene("Cap 02", 3, "Puerto", ["Elena"])], travels),
		[],
	);
	assert.deepEqual(parseTravels("---\nviajes:\n  - a: Puerto\n    dias: 3\n---\n"), []);
});
