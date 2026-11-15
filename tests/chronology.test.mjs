import assert from "node:assert/strict";
import test from "node:test";

import { chronologyNotice, impossibleTravels, parseSceneTime, parseTravels, readChronology } from "../src/chronology.ts";
import { isManuscript } from "../src/markers.ts";
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
	assert.deepEqual(parseTravels("Casa de Elena", CASA), [
		{ desde: "Casa de Elena", a: "Puerto", dias: 7 },
		{ desde: "Casa de Elena", a: "Mercado", dias: 0.5 },
	]);
	assert.deepEqual(parseTravels("Cocina", placeNote("Cocina")), []);
	assert.match(placeNote("Cocina"), /^viajes: \[\]$/m);
});

test("un viaje demasiado corto sale como par de escenas imposible, en los dos sentidos", () => {
	const travels = parseTravels("Casa de Elena", CASA);
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
	const travels = parseTravels("Casa de Elena", CASA);
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
	const travels = parseTravels("Casa de Elena", CASA);
	assert.deepEqual(
		impossibleTravels(
			[scene("Cap 09", 6, "Mercado", ["Elena"]), scene("Cap 02", 5.75, "Casa de Elena", ["Elena"])],
			travels,
		).map(({ desde, hasta, dias }) => [desde, hasta, dias]),
		[["Cap 02", "Cap 09", 0.25]],
	);
});

test("con dos rutas declaradas entre los mismos lugares manda la más corta", () => {
	const travels = [...parseTravels("Casa de Elena", CASA), { desde: "Puerto", a: "Casa de Elena", dias: 2 }];
	assert.deepEqual(
		impossibleTravels([scene("Cap 01", 1, "Casa de Elena", ["Elena"]), scene("Cap 02", 3, "Puerto", ["Elena"])], travels),
		[],
	);
});

test("un enlace con carpeta casa con la ficha por su nombre de archivo y el viaje imposible avisa", () => {
	const note = `---
dia: 2
lugar: "[[Lugares/Puerto|el puerto]]"
pov: "[[Personajes/Elena]]"
personajes: ["[[Personajes/Marcos#Pasado]]"]
---
`;
	assert.deepEqual(parseSceneTime("Cap 02", note), { nombre: "Cap 02", dia: 2, lugar: "Puerto", personajes: ["Elena", "Marcos"] });
	const faro = '---\ntipo: lugar\nnombre: "El faro"\nviajes:\n  - a: "[[Lugares/Puerto]]"\n    dias: 7\n---\n';
	const travels = parseTravels("Faro", faro);
	assert.deepEqual(travels, [{ desde: "Faro", a: "Puerto", dias: 7 }]);
	assert.deepEqual(
		impossibleTravels([scene("Cap 01", 1, "Faro", ["Elena"]), parseSceneTime("Cap 02", note)], travels).map(({ origen, destino, dias, minimo }) => [origen, destino, dias, minimo]),
		[["Faro", "Puerto", 1, 7]],
	);
});

test("la ruta sale del nombre de archivo de la ficha, no de su campo nombre", () => {
	const note = '---\ntipo: lugar\nnombre: Puerto\nviajes:\n  - a: "[[Faro]]"\n    dias: 3\n---\n';
	assert.deepEqual(parseTravels("Puerto viejo", note), [{ desde: "Puerto viejo", a: "Faro", dias: 3 }]);
	assert.deepEqual(parseTravels("", note), []);
});

test("viajes en la columna cero se leen; una sangría que no cuadra corta la lista", () => {
	const flat = "---\ntipo: lugar\nviajes:\n- a: Faro\n  dias: 3\n- a: Isla\n  dias: 1\nestados: []\n---\n";
	assert.deepEqual(parseTravels("Puerto", flat), [
		{ desde: "Puerto", a: "Faro", dias: 3 },
		{ desde: "Puerto", a: "Isla", dias: 1 },
	]);
	const mixed = "---\nviajes:\n  - a: Faro\n    dias: 3\n- a: Isla\n  dias: 1\n---\n";
	assert.deepEqual(parseTravels("Puerto", mixed), [{ desde: "Puerto", a: "Faro", dias: 3 }]);
});

test("la bóveda aporta escenas solo de Manuscrito/ y rutas solo de fichas tipo: lugar", () => {
	const sceneNote = (dia, lugar) => `---\ndia: ${dia}\nlugar: "[[${lugar}]]"\npov: "[[Elena]]"\n---\n`;
	const { scenes, travels } = readChronology([
		{ path: "Novela/Lugares/Faro.md", nombre: "Faro", note: '---\ntipo: lugar\nviajes:\n  - a: "[[Puerto]]"\n    dias: 7\n---\n' },
		{ path: "Notas/Ideas.md", nombre: "Ideas", note: '---\nviajes:\n  - a: "[[Puerto]]"\n    dias: 1\n---\n' },
		{ path: "Novela/Manuscrito/Cap 01.md", nombre: "Cap 01", note: sceneNote(1, "Faro") },
		{ path: "Novela/Manuscrito/Cap 02.md", nombre: "Cap 02", note: sceneNote(3, "Puerto") },
		{ path: "Notas/Borrador.md", nombre: "Borrador", note: sceneNote(2, "Faro") },
	]);
	assert.deepEqual(travels, [{ desde: "Faro", a: "Puerto", dias: 7 }]);
	assert.deepEqual(scenes.map((item) => item.nombre), ["Cap 01", "Cap 02"]);
	assert.deepEqual(
		impossibleTravels(scenes, travels).map(({ desde, hasta }) => [desde, hasta]),
		[["Cap 01", "Cap 02"]],
	);
});

test("los enlaces casan sin distinguir mayúsculas y el aviso muestra el nombre como se escribió", () => {
	const { scenes, travels } = readChronology([
		{ path: "Lugares/Faro.md", nombre: "Faro", note: '---\ntipo: lugar\nviajes:\n  - a: "[[Puerto]]"\n    dias: 7\n---\n' },
		{ path: "Manuscrito/Cap 01.md", nombre: "Cap 01", note: '---\ndia: 1\nlugar: "[[faro]]"\npov: "[[Elena]]"\n---\n' },
		{ path: "Manuscrito/Cap 02.md", nombre: "Cap 02", note: '---\ndia: 2\nlugar: "[[PUERTO]]"\npov: "[[elena]]"\n---\n' },
	]);
	assert.deepEqual(impossibleTravels(scenes, travels), [
		{ personaje: "Elena", desde: "Cap 01", hasta: "Cap 02", origen: "faro", destino: "PUERTO", dias: 1, minimo: 7 },
	]);
	assert.deepEqual(parseSceneTime("Cap 03", '---\ndia: 1\nlugar: Faro\npov: "[[Elena]]"\npersonajes: ["[[elena]]", "[[Marcos]]"]\n---\n').personajes, [
		"Elena",
		"Marcos",
	]);
	assert.deepEqual(impossibleTravels([scene("A", 1, "Faro", ["Elena"]), scene("B", 2, "faro", ["Elena"])], travels), []);
});

test("los comentarios YAML dentro de viajes no pierden rutas", () => {
	const note = '---\ntipo: lugar\nviajes:\n  # rutas por mar\n  - a: "[[Isla#Muelle]]" # en barco\n    dias: 7 # una semana\n\n  - a: Faro\n    dias: 2\nestados: []\n---\n';
	assert.deepEqual(parseTravels("Puerto", note), [
		{ desde: "Puerto", a: "Isla", dias: 7 },
		{ desde: "Puerto", a: "Faro", dias: 2 },
	]);
});

test("el aviso del comando: sin hallazgos, uno y dos", () => {
	assert.equal(chronologyNotice([]), "Cronología sin viajes imposibles.");
	const one = { personaje: "Elena", desde: "Cap 01", hasta: "Cap 02", origen: "Faro", destino: "Puerto", dias: 1, minimo: 7 };
	assert.equal(chronologyNotice([one]), "Elena: Cap 01 → Cap 02 (Faro → Puerto) en 1 días; mínimo 7.");
	assert.equal(
		chronologyNotice([one, { ...one, personaje: "Marcos", dias: 0.5, minimo: 2 }]),
		"Elena: Cap 01 → Cap 02 (Faro → Puerto) en 1 días; mínimo 7.\nMarcos: Cap 01 → Cap 02 (Faro → Puerto) en 0.5 días; mínimo 2.",
	);
});

test("isManuscript reconoce Manuscrito/ en la raíz o dentro de un proyecto", () => {
	assert.equal(isManuscript("Manuscrito/Cap 01.md"), true);
	assert.equal(isManuscript("Novela/Manuscrito/Cap 01.md"), true);
	assert.equal(isManuscript("Notas/Manuscritos.md"), false);
});
