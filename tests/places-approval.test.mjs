import assert from "node:assert/strict";
import test from "node:test";

import { parseDocument } from "yaml";

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

test("R6: una lista en flujo de varias líneas con `]` en la columna 0 sigue en flujo sin crear otro frontmatter", async () => {
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

test("R6: flujo de varias líneas con CRLF sigue en flujo, conserva CRLF y no duplica al aprobar dos veces", async () => {
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
	assert.match(escrita, /\n- capitulo: "\[\[Cap 03\]\]"\n {2}descripcion: en ruinas\nviajes: \[\]\n---\n$/, escrita);
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

test("QA v3: una descripción con comillas, barra invertida, `#` y `:` no se duplica al aprobar dos veces", async () => {
	const ficha = "---\nnombre: Torre\nestados: []\n---\n";
	const descripcion = 'dijo "hola" \\ fin # nota: sí';
	const respuesta = JSON.stringify({ hechos: [], estados: [{ lugar: "Torre", descripcion }] });
	const files = mockFiles({ [LUGAR]: ficha });
	const candidatos = parseProposal(respuesta);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	const primera = files.store.get(LUGAR);
	assert.deepEqual(parsePlace(primera).estados, [{ capitulo: "[[Cap 03]]", descripcion }], primera);
	await writeApproved(files, destino, candidatos, new Set(["e1"]));
	assert.equal(files.store.get(LUGAR), primera, "la segunda aprobación no cambia nada");
});

test("QA v3: flujo con `]` dentro de un valor entre comillas y comentario final conserva el estado previo", async () => {
	const ficha = ["---", "nombre: Torre", 'estados: [{capitulo: "[[Cap 01]]", descripcion: "a ] b"}] # nota', "viajes: []", "---", "Cuerpo"].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.equal(escrita.match(/^---$/gm).length, 2, escrita);
	assert.deepEqual(parsePlace(escrita).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "a ] b" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
	assert.match(escrita, /\nviajes: \[\]\n---\nCuerpo$/);
});

// #76 ronda 3 (R4, R5): la ficha se lee y se escribe con la librería `yaml`.
test("R4: `estados: # comentario` se lee con sus estados y aprobar dos veces no duplica", async () => {
	const ficha = ["---", "nombre: Torre", "estados: # cambios", '  - capitulo: "[[Cap 03]]"', "    descripcion: en ruinas", "---", ""].join("\n");
	assert.deepEqual(parsePlace(ficha).estados, [{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" }]);
	const files = mockFiles({ [LUGAR]: ficha });
	assert.deepEqual(await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"])), []);
	assert.equal(files.store.get(LUGAR), ficha);
});

test("R5: `descripcion: |-` se lee como texto y aprobar el mismo estado no lo duplica", async () => {
	const ficha = ["---", "nombre: Torre", "estados:", '  - capitulo: "[[Cap 03]]"', "    descripcion: |-", "      línea uno", "      línea dos", "viajes: []", "---", ""].join("\n");
	assert.deepEqual(parsePlace(ficha).estados, [{ capitulo: "[[Cap 03]]", descripcion: "línea uno\nlínea dos" }]);
	const respuesta = JSON.stringify({ hechos: [], estados: [{ lugar: "Torre", descripcion: "línea uno\nlínea dos" }] });
	const files = mockFiles({ [LUGAR]: ficha });
	assert.deepEqual(await writeApproved(files, destino, parseProposal(respuesta), new Set(["e1"])), []);
	assert.equal(files.store.get(LUGAR), ficha);
});

test("R7: `nombre: Torre: alta` sigue leyéndose como está escrito y su línea no cambia al aprobar", async () => {
	const ficha = ["---", "nombre: Torre: alta", "padre: \"[[Casa]]\"", "estados:", '  - capitulo: "[[Cap 01]]"', "    descripcion: intacta", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.ok(escrita.startsWith(ficha.slice(0, ficha.indexOf("---\n", 4))), escrita);
	assert.deepEqual(parsePlace(escrita), {
		nombre: "Torre: alta",
		padre: "[[Casa]]",
		estados: [
			{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
			{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
		],
	});
});

test("R6 nit: un valor anidado de la lista en flujo sigue como está escrito al añadir un estado", async () => {
	const ficha = "---\nnombre: Torre\nestados: [{capitulo: [[Cap 01]], descripcion: intacta, extra: {a: 1}}]\n---\n";
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.ok(escrita.includes("estados: [{capitulo: [[Cap 01]], descripcion: intacta, extra: {a: 1}}, {"), escrita);
	assert.deepEqual(parsePlace(escrita).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
});

// QA v4: valores sin comillas que el esquema core de YAML leería como otro tipo.
test("QA v4: un estado escrito a mano sin comillas (`null`, `0x1F`, `1e3`, `.inf`) se lee como está y no se duplica", async () => {
	for (const descripcion of ["null", "0x1F", "1e3", ".inf", "0o17", "+12"]) {
		const ficha = `---\nnombre: Torre\nestados:\n  - capitulo: "[[Cap 03]]"\n    descripcion: ${descripcion}\n---\n`;
		assert.deepEqual(parsePlace(ficha).estados, [{ capitulo: "[[Cap 03]]", descripcion }]);
		const files = mockFiles({ [LUGAR]: ficha });
		const respuesta = JSON.stringify({ hechos: [], estados: [{ lugar: "Torre", descripcion }] });
		assert.deepEqual(await writeApproved(files, destino, parseProposal(respuesta), new Set(["e1"])), [], descripcion);
		assert.equal(files.store.get(LUGAR), ficha);
	}
});

// #77 seguimiento (R7, R9, R10, R11).
test("R7 seguimiento: si falla la segunda ficha de lugar, la primera vuelve a su contenido y _Memoria/ no cambia", async () => {
	const memoria = "---\ntipo: memoria\ncapitulo: 3\nhechos: []\n---\n";
	const torre = "---\nnombre: Torre\nestados: []\n---\n";
	const casa = "---\nnombre: Casa\nestados: []\n---\n";
	const CASA = "Proyecto/Lugares/Casa.md";
	const respuesta = JSON.stringify({
		hechos: [{ id: "carta", texto: "La carta es falsa", verdad: false }],
		estados: [
			{ lugar: "Torre", descripcion: "en ruinas" },
			{ lugar: "Casa", descripcion: "vacía" },
		],
	});
	const files = mockFiles({ [MEMORIA]: memoria, [LUGAR]: torre, [CASA]: casa }, CASA);
	await assert.rejects(writeApproved(files, destino, parseProposal(respuesta), new Set(["h1", "e1", "e2"])), /no se pudo escribir/);
	assert.equal(files.store.get(LUGAR), torre);
	assert.equal(files.store.get(CASA), casa);
	assert.equal(files.store.get(MEMORIA), memoria);
});

test("R9: una lista en flujo con comentario sigue en flujo y conserva el comentario al añadir un estado", async () => {
	const ficha = ["---", "nombre: Torre", 'estados: [{capitulo: "[[Cap 01]]", descripcion: intacta}] # orden de capítulos', "viajes: []", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.ok(escrita.includes('estados: [{capitulo: "[[Cap 01]]", descripcion: intacta}, {'), escrita);
	assert.ok(escrita.includes("}] # orden de capítulos\nviajes: []\n"), escrita);
	assert.deepEqual(parsePlace(escrita).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
});

test("R9: en un flujo de varias líneas, el estado nuevo no cae dentro del comentario tras el último elemento", async () => {
	const ficha = ["---", "nombre: Torre", "estados: [ # cambios", '  {capitulo: "[[Cap 01]]", descripcion: intacta}, # primero', "]", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.ok(escrita.includes("estados: [ # cambios\n") && escrita.includes(" # primero\n]\n"), escrita);
	assert.deepEqual(parsePlace(escrita).estados, [
		{ capitulo: "[[Cap 01]]", descripcion: "intacta" },
		{ capitulo: "[[Cap 03]]", descripcion: "en ruinas" },
	]);
});

test("R10: una entrada de `estados` que no es YAML estricto no borra las demás y se avisa", () => {
	const ficha = ["---", "nombre: Torre", "estados:", '  - capitulo: "[[Cap 01]]"', "    descripcion: a: b", '  - capitulo: "[[Cap 02]]"', "    descripcion: intacta", "---", ""].join("\n");
	const avisos = [];
	const warn = console.warn;
	console.warn = (...args) => avisos.push(args.join(" "));
	try {
		assert.deepEqual(parsePlace(ficha).estados, [{ capitulo: "[[Cap 02]]", descripcion: "intacta" }]);
	} finally {
		console.warn = warn;
	}
	assert.equal(avisos.length, 1);
	assert.match(avisos[0], /estados/);
});

test("R10: con una entrada rota, aprobar un estado nuevo no escribe y uno ya presente no se duplica", async () => {
	const ficha = ["---", "nombre: Torre", "estados:", "  - capitulo: x", "    descripcion: a: b", '  - capitulo: "[[Cap 03]]"', "    descripcion: en ruinas", "---", ""].join("\n");
	const warn = console.warn;
	console.warn = () => {};
	try {
		const files = mockFiles({ [LUGAR]: ficha });
		assert.deepEqual(await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"])), []);
		const nuevo = JSON.stringify({ hechos: [], estados: [{ lugar: "Torre", descripcion: "otra" }] });
		await assert.rejects(writeApproved(files, destino, parseProposal(nuevo), new Set(["e1"])), /no se puede leer/);
		assert.equal(files.store.get(LUGAR), ficha);
	} finally {
		console.warn = warn;
	}
});

test("R11: `null` y `123` añadidos a una lista vacía o en flujo se leen como texto con el esquema core", async () => {
	for (const ficha of ["---\nnombre: Torre\nestados: []\n---\n", "---\nnombre: Torre\nestados: [{capitulo: a, descripcion: b}]\n---\n"]) {
		for (const descripcion of ["null", "123"]) {
			const files = mockFiles({ [LUGAR]: ficha });
			const respuesta = JSON.stringify({ hechos: [], estados: [{ lugar: "Torre", descripcion }] });
			await writeApproved(files, destino, parseProposal(respuesta), new Set(["e1"]));
			const escrita = files.store.get(LUGAR);
			const core = parseDocument(escrita.split("---\n")[1]).toJS();
			assert.equal(core.estados.at(-1).descripcion, descripcion, escrita);
		}
	}
});
