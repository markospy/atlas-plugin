import assert from "node:assert/strict";
import test from "node:test";

import { impossibleTravels, parseSceneTime, parseTravels, readChronology } from "../src/chronology.ts";

test("qa: escena con CRLF, alias en los enlaces y personajes en lista de bloque", () => {
	const note = '---\r\ndia: "2.5"\r\nlugar: "[[Puerto|el puerto]]"\r\npov: "[[Elena|la doctora]]"\r\npersonajes:\r\n  - "[[Marcos]]"\r\n  - "[[Elena]]"\r\n---\r\nTexto.\r\n';
	assert.deepEqual(parseSceneTime("Cap 05", note), {
		nombre: "Cap 05",
		dia: 2.5,
		lugar: "Puerto",
		personajes: ["Elena", "Marcos"],
	});
	assert.equal(parseSceneTime("Cap 06", "---\ndia:\nlugar: Puerto\n---\n"), null);
	assert.equal(parseSceneTime("Cap 07", "---\ndia: 4\nlugar:\n---\n"), null);
});

test("qa: viajes con CRLF, sin comillas y con campos en otro orden; para en la siguiente clave", () => {
	const note = '---\r\nnombre: "Puerto"\r\nviajes:\r\n  - dias: 3\r\n    a: Faro\r\n  - a: "[[Casa de Elena]]"\r\n    dias: "7"\r\n  - a: "[[Isla]]"\r\n    dias: lejos\r\nestados: []\r\n---\r\n';
	assert.deepEqual(parseTravels("Puerto", note), [
		{ desde: "Puerto", a: "Faro", dias: 3 },
		{ desde: "Puerto", a: "Casa de Elena", dias: 7 },
	]);
});

test("qa: dos escenas el mismo día en lugares con ruta declarada se avisan una vez por personaje", () => {
	const travels = [{ desde: "Puerto", a: "Faro", dias: 1 }];
	const found = impossibleTravels(
		[
			{ nombre: "Cap 01", dia: 4, lugar: "Puerto", personajes: ["Elena", "Marcos"] },
			{ nombre: "Cap 02", dia: 4, lugar: "Faro", personajes: ["Elena", "Marcos"] },
		],
		travels,
	);
	assert.deepEqual(
		found.map(({ personaje, desde, hasta, dias, minimo }) => [personaje, desde, hasta, dias, minimo]),
		[
			["Elena", "Cap 01", "Cap 02", 0, 1],
			["Marcos", "Cap 01", "Cap 02", 0, 1],
		],
	);
	assert.deepEqual(impossibleTravels([], travels), []);
	assert.deepEqual(
		impossibleTravels([{ nombre: "Cap 01", dia: 1, lugar: "Puerto", personajes: [] }], travels),
		[],
	);
});

test("qa: ruta en minúsculas, con carpeta y comentario casa en sentido inverso", () => {
	const { scenes, travels } = readChronology([
		{ path: "Lugares/Faro.md", nombre: "Faro", note: '---\ntipo: lugar\nviajes:\n  - a: "[[Lugares/puerto]]" # en barco\n    dias: 7\n---\n' },
		{ path: "Manuscrito/Cap 01.md", nombre: "Cap 01", note: '---\ndia: 1\nlugar: "[[Puerto]]"\npov: "[[Elena]]"\n---\n' },
		{ path: "Manuscrito/Cap 02.md", nombre: "Cap 02", note: '---\ndia: 3\nlugar: "[[FARO]]"\npov: "[[Elena]]"\n---\n' },
	]);
	assert.deepEqual(
		impossibleTravels(scenes, travels).map(({ desde, hasta, dias, minimo }) => [desde, hasta, dias, minimo]),
		[["Cap 01", "Cap 02", 2, 7]],
	);
});
