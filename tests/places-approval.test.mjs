import assert from "node:assert/strict";
import test from "node:test";

import { parseProposal, writeApproved } from "../src/extract.ts";
import { parsePlace } from "../src/places.ts";

// #76: aprobar estados de lugar. R6 lista en flujo, R7 YAML inválido, R8 escritura a medias.
const MEMORIA = "Proyecto/_Memoria/Cap 03.md";
const LUGAR = "Proyecto/Lugares/Torre.md";
const destino = { capitulo: 3, memoria: MEMORIA, lugar: (nombre) => `Proyecto/Lugares/${nombre}.md` };
const RESPUESTA = JSON.stringify({
	hechos: [{ id: "carta", texto: "La carta es falsa", verdad: false }],
	estados: [{ lugar: "Torre", descripcion: "en ruinas" }],
});

function mockFiles(initial, failOn = null) {
	const store = new Map(Object.entries(initial));
	return {
		store,
		exists: async (path) => store.has(path),
		createFolder: async () => {},
		read: async (path) => store.get(path),
		write: async (path, data) => {
			if (path === failOn) {
				throw new Error(`no se pudo escribir ${path}`);
			}
			store.set(path, data);
		},
	};
}

test("R6: aprobar dos veces un estado sobre `estados: [{...}]` en flujo deja un solo estado", async () => {
	const ficha = ["---", "nombre: Torre", 'estados: [{capitulo: "[[Cap 01]]", descripcion: intacta}]', "viajes: []", "---", "Cuerpo", ""].join("\n");
	assert.deepEqual(parsePlace(ficha).estados, [{ capitulo: "[[Cap 01]]", descripcion: "intacta" }], "parsePlace lee el flujo");
	const files = mockFiles({ [LUGAR]: ficha });
	const candidatos = parseProposal(RESPUESTA);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	const primera = files.store.get(LUGAR);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	assert.equal(files.store.get(LUGAR), primera, "la segunda aprobación no cambia nada");
	assert.deepEqual(parsePlace(primera).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
	assert.match(primera, /\nviajes: \[\]\n---\nCuerpo\n$/, "el resto de la ficha sigue igual");
});

test("R6: un estado que ya está en la lista en flujo no se duplica", async () => {
	const ficha = ["---", "nombre: Torre", "estados: [{capitulo: '[[Cap 03]]', descripcion: en ruinas}]", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	const escritos = await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	assert.deepEqual(escritos, []);
	assert.equal(files.store.get(LUGAR), ficha);
});

test("R7: una ficha con `nombre: Torre: alta` acepta el estado", async () => {
	const ficha = ["---", "nombre: Torre: alta", "estados: []", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.ok(escrita.startsWith("---\nnombre: Torre: alta\nestados:\n"), escrita);
	assert.equal(parsePlace(escrita).nombre, "Torre: alta");
	assert.deepEqual(parsePlace(escrita).estados, [{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" }]);
});

test("R8: si la ficha de lugar no se puede escribir, _Memoria/ queda sin cambios y el error sale", async () => {
	const memoria = "---\ntipo: memoria\ncapitulo: 3\nhechos: []\n---\n";
	const ficha = "---\nnombre: Torre\nestados: []\n---\n";
	const files = mockFiles({ [MEMORIA]: memoria, [LUGAR]: ficha }, LUGAR);
	await assert.rejects(writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1", "e1"])), /no se pudo escribir/);
	assert.equal(files.store.get(MEMORIA), memoria);
	assert.equal(files.store.get(LUGAR), ficha);
});

test("R8: si la ficha de lugar no admite el estado, no se escribe nada", async () => {
	const memoria = "---\ntipo: memoria\ncapitulo: 3\nhechos: []\n---\n";
	const ficha = "---\nnombre: Torre\nestados: en ruinas\n---\n";
	const files = mockFiles({ [MEMORIA]: memoria, [LUGAR]: ficha });
	await assert.rejects(writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1", "e1"])), /estados/);
	assert.equal(files.store.get(MEMORIA), memoria);
	assert.equal(files.store.get(LUGAR), ficha);
});

test("R6: una lista en flujo de varias líneas con `]` en la columna 0 pasa a bloque sin crear otro frontmatter", async () => {
	const ficha = ["---", "nombre: Torre", "estados: [", '  {capitulo: "[[Cap 01]]", descripcion: intacta}', "]", "viajes: []", "---", "Cuerpo", ""].join("\n");
	assert.equal(parsePlace(ficha).estados.length, 1, "parsePlace lee el flujo de varias líneas");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.equal(escrita.match(/^---$/gm).length, 2, `un solo frontmatter: ${JSON.stringify(escrita)}`);
	assert.equal(parsePlace(escrita).nombre, "Torre");
	assert.deepEqual(parsePlace(escrita).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
});

test("R6: flujo de varias líneas con CRLF pasa a bloque, conserva CRLF y no duplica al aprobar dos veces", async () => {
	const ficha = ["---", "nombre: Torre", "estados: [", '  {capitulo: "[[Cap 01]]", descripcion: intacta}', "]", "---", "Cuerpo"].join("\r\n");
	const files = mockFiles({ [LUGAR]: ficha });
	const candidatos = parseProposal(RESPUESTA);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	const primera = files.store.get(LUGAR);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	assert.equal(files.store.get(LUGAR), primera, "la segunda aprobación no cambia nada");
	assert.ok(!/[^\r]\n/.test(primera), `solo CRLF: ${JSON.stringify(primera)}`);
	assert.deepEqual(parsePlace(primera).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
});

test("R6: lista en bloque sin sangría recibe el estado a su sangría, antes de la clave siguiente", async () => {
	const ficha = ["---", "nombre: Torre", "estados:", '- capitulo: "[[Cap 01]]"', "  descripcion: intacta", "viajes: []", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.match(escrita, /\n- capitulo: "\[\[Cap 03\]\]"\n {2}descripcion: "en ruinas"\nviajes: \[\]\n---\n$/, escrita);
	assert.equal(parsePlace(escrita).estados.length, 2);
});

test("R6: aprobar dos veces una descripción de varias líneas deja un solo estado y se lee igual", async () => {
	const ficha = "---\nnombre: Torre\nestados: []\n---\n";
	const respuesta = JSON.stringify({ hechos: [], estados: [{ lugar: "Torre", descripcion: "línea uno\nlínea dos" }] });
	const files = mockFiles({ [LUGAR]: ficha });
	const candidatos = parseProposal(respuesta);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	const primera = files.store.get(LUGAR);
	assert.deepEqual(parsePlace(primera).estados, [{ capitulo: "[[Cap 03]]", descripcion: "línea uno\nlínea dos" }], primera);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	assert.equal(files.store.get(LUGAR), primera, "la segunda aprobación no cambia nada");
});

test("R6: una lista en flujo con elementos que no son mapas no se reescribe y el error sale", async () => {
	const ficha = "---\nnombre: Torre\nestados: [intacta, {capitulo: x, descripcion: y}]\n---\n";
	const files = mockFiles({ [LUGAR]: ficha });
	await assert.rejects(writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"])), /no se puede leer/);
	assert.equal(files.store.get(LUGAR), ficha);
});

test("R6: `estados: # comentario` con lista en bloque recibe el estado", async () => {
	const ficha = ["---", "nombre: Torre", "estados: # cambios", '  - capitulo: "[[Cap 01]]"', "    descripcion: intacta", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	assert.deepEqual(parsePlace(files.store.get(LUGAR)).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
});
