import assert from "node:assert/strict";
import test from "node:test";

import { candidateLabel, extractionPrompt, parseProposal, proposeMemoryUpdates, writeApproved } from "../src/extract.ts";
import { parseMemory } from "../src/memory.ts";
import { parsePlace } from "../src/places.ts";

// Respuesta simulada de la IA: dos hechos, un conocimiento, un estado y basura que se descarta.
const RESPUESTA = `Aquí tienes:
\`\`\`json
{
  "hechos": [
    { "id": "carta", "texto": "La carta es falsa", "verdad": false },
    { "id": "herida", "texto": "Iván está herido", "verdad": true },
    { "texto": "sin id" }
  ],
  "conocimiento": [
    { "hecho": "carta", "quien": "[[Elena]]", "estado": "sospecha" },
    { "hecho": "carta", "quien": "lector", "estado": "adivina" }
  ],
  "estados": [
    { "lugar": "Casa del lago", "descripcion": "quemada" }
  ]
}
\`\`\``;

const CASA = `---
tipo: lugar
nombre: "Casa del lago"
padre:
estados: []
---

## Vista
`;

const MEMORIA = "Proyecto/_Memoria/Cap 03.md";
const CASA_PATH = "Proyecto/Lugares/Casa del lago.md";

function mockFiles(initial = {}) {
	const store = new Map(Object.entries(initial));
	const writes = [];
	return {
		store,
		writes,
		exists: async (path) => store.has(path),
		createFolder: async (path) => {
			writes.push(`mkdir ${path}`);
		},
		read: async (path) => store.get(path),
		write: async (path, data) => {
			writes.push(path);
			store.set(path, data);
		},
	};
}

const destino = {
	capitulo: 3,
	memoria: MEMORIA,
	lugar: (nombre) => `Proyecto/Lugares/${nombre}.md`,
};

test("la propuesta lista hechos, conocimiento y estados candidatos (IA simulada)", async () => {
	const prompts = [];
	const complete = async (prompt) => {
		prompts.push(prompt);
		return RESPUESTA;
	};
	const candidatos = await proposeMemoryUpdates({ capitulo: 3, texto: "Elena quema la casa." }, complete);
	assert.equal(prompts.length, 1);
	assert.match(prompts[0], /Elena quema la casa\./);
	assert.match(prompts[0], /capítulo 3/);
	assert.deepEqual(
		candidatos.map((c) => [c.id, c.tipo]),
		[
			["h1", "hecho"],
			["h2", "hecho"],
			["c1", "conocimiento"],
			["e1", "estado"],
		],
	);
	assert.deepEqual(candidatos.map(candidateLabel), [
		"Hecho carta: La carta es falsa (falso)",
		"Hecho herida: Iván está herido (verdadero)",
		"[[Elena]] · sospecha · carta",
		"Casa del lago: quemada",
	]);
});

test("una respuesta sin JSON válido no propone nada", () => {
	assert.deepEqual(parseProposal("no sé"), []);
	assert.deepEqual(parseProposal("{ roto"), []);
	assert.deepEqual(parseProposal('{"hechos": "x"}'), []);
});

test("el prompt lista los hechos ya registrados para no duplicarlos", () => {
	const prompt = extractionPrompt({
		capitulo: 4,
		texto: "Texto",
		memorias: [parseMemory(`---\ncapitulo: 2\nhechos:\n  - id: carta\n    texto: "La carta es falsa"\n---\n`)],
	});
	assert.match(prompt, /- carta: La carta es falsa/);
});

test("aceptar escribe solo los ítems marcados (aprobación parcial)", async () => {
	const files = mockFiles({ [CASA_PATH]: CASA });
	const candidatos = parseProposal(RESPUESTA);
	const escritos = await writeApproved(files, destino, candidatos, new Set(["h1", "c1", "e1"]));
	assert.deepEqual(escritos, [MEMORIA, CASA_PATH]);

	const memoria = parseMemory(files.store.get(MEMORIA));
	assert.equal(memoria.capitulo, 3);
	assert.deepEqual(memoria.hechos, [{ id: "carta", texto: "La carta es falsa", verdad: false }]);
	assert.deepEqual(memoria.conocimiento, [{ hecho: "carta", quien: "[[Elena]]", estado: "sospecha" }]);

	const casa = files.store.get(CASA_PATH);
	assert.deepEqual(parsePlace(casa).estados, [{ capitulo: "[[Cap 03]]", descripcion: "quemada" }]);
	assert.match(casa, /## Vista/);
});

test("aceptar añade a una memoria existente sin pisar lo corregido a mano", async () => {
	const existente = `---
tipo: memoria
capitulo: 3
hechos:
  - id: carta
    texto: "La carta es auténtica"
    verdad: true
conocimiento: []
---

Notas a mano.
`;
	const files = mockFiles({ [MEMORIA]: existente });
	await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["h1", "h2"]));
	const nota = files.store.get(MEMORIA);
	assert.deepEqual(parseMemory(nota).hechos, [
		{ id: "carta", texto: "La carta es auténtica", verdad: true },
		{ id: "herida", texto: "Iván está herido", verdad: true },
	]);
	assert.match(nota, /Notas a mano\./);
	assert.match(nota, /^tipo: memoria$/m);
});

test("rechazar todo no crea ni modifica _Memoria/", async () => {
	const files = mockFiles({ [CASA_PATH]: CASA });
	const escritos = await writeApproved(files, destino, parseProposal(RESPUESTA), new Set());
	assert.deepEqual(escritos, []);
	assert.deepEqual(files.writes, []);
	assert.equal(files.store.has(MEMORIA), false);
	assert.equal(files.store.get(CASA_PATH), CASA);
});

test("un estado de un lugar sin ficha no crea la ficha", async () => {
	const files = mockFiles();
	const escritos = await writeApproved(files, destino, parseProposal(RESPUESTA), new Set(["e1"]));
	assert.deepEqual(escritos, []);
	assert.deepEqual(files.writes, []);
});
