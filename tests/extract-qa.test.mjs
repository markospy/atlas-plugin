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
