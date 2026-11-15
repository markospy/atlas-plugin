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
