import assert from "node:assert/strict";
import test from "node:test";

import { parseProposal, writeApproved } from "../src/extract.ts";
import { parseMemory } from "../src/memory.ts";

// QA #19: una ficha de _Memoria/ corregida a mano puede no tener frontmatter (o tenerlo vacío).
// Aprobar un hecho no debe dejar la nota rota ni perder lo aprobado.
const MEMORIA = "Proyecto/_Memoria/Cap 03.md";
const destino = { capitulo: 3, memoria: MEMORIA, lugar: (nombre) => `Proyecto/Lugares/${nombre}.md` };
const RESPUESTA = JSON.stringify({ hechos: [{ id: "carta", texto: "La carta es falsa", verdad: false }] });

function mockFiles(initial) {
	const store = new Map(Object.entries(initial));
	return {
		store,
		exists: async (path) => store.has(path),
		createFolder: async () => {},
		read: async (path) => store.get(path),
		write: async (path, data) => {
			store.set(path, data);
		},
	};
}

for (const [caso, nota] of [
	["sin frontmatter", "Notas a mano.\n"],
	["con frontmatter vacío", "---\n---\nNotas a mano.\n"],
]) {
	test(`aceptar en una memoria ${caso} deja frontmatter válido y conserva la nota`, async () => {
		const files = mockFiles({ [MEMORIA]: nota });
		await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
		const escrita = files.store.get(MEMORIA);
		assert.match(escrita, /\n---\n/, "el cierre --- va en su propia línea");
		assert.deepEqual(parseMemory(escrita).hechos, [{ id: "carta", texto: "La carta es falsa", verdad: false }]);
		assert.match(escrita, /Notas a mano\./);
	});
}

// QA #19 v2: aprobar un ítem no debe borrar lo que el escritor corrigió a mano en las demás entradas.
test("aceptar un hecho conserva campos y comentarios escritos a mano en _Memoria/", async () => {
	const nota = [
		"---",
		"tipo: memoria",
		"capitulo: 3",
		"hechos:",
		"  # corregido a mano",
		"  - id: anillo",
		'    texto: "El anillo"',
		"    verdad: true",
		'    nota: "revisar en cap 5"',
		"conocimiento: []",
		"---",
		"Cuerpo",
		"",
	].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	assert.match(escrita, /# corregido a mano/, "el comentario a mano sigue");
	assert.match(escrita, /nota: "revisar en cap 5"/, "el campo a mano sigue");
	assert.deepEqual(parseMemory(escrita).hechos.map((h) => h.id), ["anillo", "carta"]);
});

test("aceptar un estado conserva campos escritos a mano en la ficha del lugar", async () => {
	const LUGAR = "Proyecto/Lugares/Torre.md";
	const ficha = ["---", "nombre: Torre", "estados:", '  - capitulo: "[[Cap 01]]"', '    descripcion: "intacta"', "    nota: x", "---", ""].join("\n");
	const files = mockFiles({ [LUGAR]: ficha });
	const respuesta = JSON.stringify({ estados: [{ lugar: "Torre", descripcion: "en ruinas" }] });
	await writeApproved(files, destino, parseProposal(respuesta), new Set(["e1"]));
	const escrita = files.store.get(LUGAR);
	assert.match(escrita, /nota: x/, "el campo a mano sigue");
	assert.match(escrita, /en ruinas/);
});

test("aceptar en una memoria que abre con un --- de escena no mete el cuerpo en el frontmatter", async () => {
	const nota = "---\nEl capítulo empieza.\n---\nmás\n";
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	assert.ok(escrita.endsWith(nota), "el cuerpo original queda intacto tras el frontmatter");
	assert.deepEqual(parseMemory(escrita).hechos, [{ id: "carta", texto: "La carta es falsa", verdad: false }]);
});

// Huecos de test de QA v1/v2: repetir datos no duplica entradas.
test("un id de hecho repetido en la propuesta se escribe una sola vez", async () => {
	const files = mockFiles({});
	const respuesta = JSON.stringify({ hechos: [{ id: "carta", texto: "A" }, { id: "carta", texto: "B" }] });
	await writeApproved(files, destino, parseProposal(respuesta), new Set(["h1", "h2"]));
	assert.deepEqual(parseMemory(files.store.get(MEMORIA)).hechos.map((h) => h.id), ["carta"]);
});

test("repetir una aprobación no duplica conocimiento ni estados", async () => {
	const LUGAR = "Proyecto/Lugares/Torre.md";
	const files = mockFiles({ [LUGAR]: "---\nnombre: Torre\nestados: []\n---\n" });
	const respuesta = JSON.stringify({
		conocimiento: [{ hecho: "carta", quien: "lector", estado: "sabe" }],
		estados: [{ lugar: "Torre", descripcion: "en ruinas" }],
	});
	const candidatos = parseProposal(respuesta);
	await writeApproved(files, destino, candidatos, new Set(["c1", "e1"]));
	const primera = [files.store.get(MEMORIA), files.store.get(LUGAR)];
	await writeApproved(files, destino, candidatos, new Set(["c1", "e1"]));
	assert.deepEqual([files.store.get(MEMORIA), files.store.get(LUGAR)], primera);
});

// QA #19 v3: un frontmatter real cuya primera línea no es `clave:` (comentario YAML o propiedad
// de Obsidian con espacios) no es un `---` de escena. Aprobar no debe anteponer otro frontmatter:
// los hechos ya registrados dejarían de leerse y `tipo`/`capitulo` pasarían al cuerpo.
for (const [caso, primera] of [
	["un comentario YAML", "# revisado a mano"],
	["una propiedad con espacios", "mi nota: revisar"],
]) {
	test(`aceptar en una memoria cuyo frontmatter abre con ${caso} conserva los hechos ya registrados`, async () => {
		const nota = ["---", primera, "tipo: memoria", "capitulo: 3", "hechos:", "  - id: anillo", '    texto: "El anillo"', "---", "Cuerpo", ""].join("\n");
		assert.deepEqual(parseMemory(nota).hechos.map((h) => h.id), ["anillo"], "antes de aprobar se lee el hecho");
		const files = mockFiles({ [MEMORIA]: nota });
		await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
		const escrita = files.store.get(MEMORIA);
		assert.equal(escrita.split("\n").filter((line) => line === "---").length, 2, "un solo frontmatter");
		assert.deepEqual(parseMemory(escrita).hechos.map((h) => h.id), ["anillo", "carta"]);
		assert.equal(parseMemory(escrita).capitulo, 3);
	});
}

// QA #19 v4: el escritor y el lector deben coincidir en dónde acaba el frontmatter, y aprobar
// nunca borra un valor en línea escrito a mano.
test("aceptar en una memoria cuyo cierre --- lleva espacios al final no antepone otro frontmatter", async () => {
	const nota = ["---", "tipo: memoria", "capitulo: 3", "hechos:", "  - id: anillo", '    texto: "El anillo"', "--- ", "Cuerpo", ""].join("\n");
	assert.deepEqual(parseMemory(nota).hechos.map((h) => h.id), ["anillo"], "antes de aprobar se lee el hecho");
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	assert.deepEqual(parseMemory(escrita).hechos.map((h) => h.id), ["anillo", "carta"]);
	assert.equal(parseMemory(escrita).capitulo, 3);
});

test("aceptar un hecho no borra una lista hechos: en línea escrita a mano", async () => {
	const nota = ["---", "tipo: memoria", "capitulo: 3", "hechos: [{id: anillo, texto: El anillo}]", "---", "Cuerpo", ""].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	assert.match(escrita, /anillo/, "el hecho escrito a mano sigue en la nota");
});

// #70: lector y escritor comparten el frontmatter de src/frontmatter.ts.
test("aceptar añade a una lista hechos: en línea sin reescribirla y el lector ve todas las entradas", async () => {
	const nota = ["---", "tipo: memoria", "capitulo: 3", 'hechos: [{id: anillo, texto: El anillo}, {id: "llave", texto: "Una llave, rota", verdad: true}]', "---", "Cuerpo", ""].join("\n");
	assert.deepEqual(parseMemory(nota).hechos.map((h) => h.id), ["anillo", "llave"], "el lector lee la lista en línea");
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	assert.deepEqual(parseMemory(escrita).hechos, [
		{ id: "anillo", texto: "El anillo", verdad: null },
		{ id: "llave", texto: "Una llave, rota", verdad: true },
		{ id: "carta", texto: "La carta es falsa", verdad: false },
	]);
	assert.equal(parseMemory(escrita).capitulo, 3);
	assert.ok(escrita.includes('hechos: [{id: anillo, texto: El anillo}, {id: "llave", texto: "Una llave, rota", verdad: true}, {'), "las entradas a mano quedan tal cual");
});

test("aceptar un hecho ya escrito en una lista en línea no lo duplica", async () => {
	const nota = ["---", "tipo: memoria", "capitulo: 3", "hechos: [{id: carta, texto: A mano}]", "---", ""].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	const escritos = await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	assert.deepEqual(escritos, []);
	assert.equal(files.store.get(MEMORIA), nota);
});

test("aceptar en una lista hechos: con un valor que no es lista falla sin tocar la nota", async () => {
	const nota = ["---", "tipo: memoria", "capitulo: 3", "hechos: revisar", "---", ""].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	await assert.rejects(writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"])), /hechos/);
	assert.equal(files.store.get(MEMORIA), nota);
});

// QA #70 v1: una lista de flujo en varias líneas es YAML válido (Obsidian la lee). Su `]` en la
// columna 0 no debe hacer que aprobar tome el bloque por un `---` de escena y anteponga otro
// frontmatter: `tipo`/`capitulo` y los hechos a mano pasarían al cuerpo.
test("aceptar en una memoria con hechos: en flujo de varias líneas no antepone otro frontmatter", async () => {
	const nota = ["---", "tipo: memoria", "capitulo: 3", "hechos: [", "  {id: anillo, texto: El anillo}", "]", "---", "Cuerpo", ""].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	assert.equal(escrita.split("\n").filter((line) => line === "---").length, 2, "un solo frontmatter");
	assert.equal(parseMemory(escrita).capitulo, 3);
	assert.deepEqual(parseMemory(escrita).hechos.map((h) => h.id), ["anillo", "carta"]);
});

// #70 v2: lector y escritor leen el frontmatter con la librería `yaml`, sin parseo a mano.
test("el lector ve los hechos de una lista en flujo de varias líneas y con comentario al final", () => {
	const varias = ["---", "capitulo: 3", "hechos: [", "  {id: anillo, texto: El anillo},", "  {id: llave, texto: \"Una llave, rota\", verdad: true}", "]", "---", ""].join("\n");
	assert.deepEqual(parseMemory(varias).hechos.map((h) => h.id), ["anillo", "llave"]);
	const comentario = ["---", "capitulo: 3", "hechos: [{id: anillo, texto: El anillo}] # a mano", "---", ""].join("\n");
	assert.deepEqual(parseMemory(comentario).hechos.map((h) => h.id), ["anillo"]);
});

test("aceptar en una memoria cuyo frontmatter no es YAML válido falla sin tocar la nota", async () => {
	const nota = ["---", "tipo: memoria", "hechos:", "  - id: anillo", "    texto: El anillo: dorado", "---", "Cuerpo", ""].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	await assert.rejects(writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"])), /YAML/);
	assert.equal(files.store.get(MEMORIA), nota);
});

// #70 R2: aprobar solo añade líneas a la lista; el resto del frontmatter queda byte a byte.
test("aceptar un hecho deja intactos byte a byte los campos que no toca", async () => {
	const antes = ["---", "tipo: memoria", "capitulo: 03", "alias:", "- x", "conocimiento:", "  - hecho: anillo", "    quien: [[Ana]]", "    estado: sabe", "hechos:", "  - id: anillo", "    texto: El anillo # a mano", "otro: 'sí'"];
	const nota = [...antes, "---", "Cuerpo", ""].join("\n");
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1"]));
	const escrita = files.store.get(MEMORIA);
	const nuevas = ["  - id: carta", "    texto: La carta es falsa", "    verdad: false"];
	assert.equal(escrita, [...antes.slice(0, 12), ...nuevas, ...antes.slice(12), "---", "Cuerpo", ""].join("\n"));
	assert.deepEqual(parseMemory(escrita).hechos.map((h) => h.id), ["anillo", "carta"]);
});

test("aceptar un estado en una ficha con CRLF añade solo sus líneas", async () => {
	const LUGAR = "Proyecto/Lugares/Torre.md";
	const ficha = ["---", "nombre: Torre", "estados:", "- capitulo: '[[Cap 01]]'", "  descripcion: intacta", "---", ""].join("\r\n");
	const files = mockFiles({ [LUGAR]: ficha });
	const respuesta = JSON.stringify({ estados: [{ lugar: "Torre", descripcion: "en ruinas" }] });
	await writeApproved(files, destino, parseProposal(respuesta), new Set(["e1"]));
	assert.equal(
		files.store.get(LUGAR),
		["---", "nombre: Torre", "estados:", "- capitulo: '[[Cap 01]]'", "  descripcion: intacta", '- capitulo: "[[Cap 03]]"', '  descripcion: "en ruinas"', "---", ""].join("\r\n"),
	);
});

// QA #70 v4: CRLF y cierre `---` con espacios; hechos y conocimiento se añaden al mismo frontmatter.
test("aceptar un hecho y su conocimiento en una memoria CRLF cuyo cierre --- lleva espacios", async () => {
	const nota = ["---", "capitulo: 3", "hechos:", "  - id: anillo", "    texto: El anillo", "---  ", "Cuerpo", ""].join("\r\n");
	const respuesta = JSON.stringify({ hechos: [{ id: "007", texto: "Dice: \"no\" # y [[Ana]]", verdad: true }], conocimiento: [{ hecho: "007", quien: "[[Ana]]", estado: "sabe" }] });
	const files = mockFiles({ [MEMORIA]: nota });
	await writeApproved(files, destino, parseProposal(respuesta), new Set(["h1", "c1"]));
	const escrita = files.store.get(MEMORIA);
	assert.ok(escrita.startsWith("---\r\ncapitulo: 3\r\nhechos:\r\n  - id: anillo\r\n    texto: El anillo\r\n"), "lo escrito a mano queda delante, sin otro frontmatter");
	assert.ok(escrita.endsWith("---  \r\nCuerpo\r\n"), "el cierre y el cuerpo quedan byte a byte");
	assert.ok(!/(^|[^\r])\n/.test(escrita), "solo CRLF");
	const memoria = parseMemory(escrita);
	assert.deepEqual(memoria.hechos, [
		{ id: "anillo", texto: "El anillo", verdad: null },
		{ id: "007", texto: "Dice: \"no\" # y [[Ana]]", verdad: true },
	]);
	assert.deepEqual(memoria.conocimiento, [{ hecho: "007", quien: "[[Ana]]", estado: "sabe" }]);
	assert.equal(memoria.capitulo, 3);
});
