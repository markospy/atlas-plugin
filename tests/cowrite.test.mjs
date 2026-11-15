import assert from "node:assert/strict";
import test from "node:test";

import { CoWriteSession, coWriteContext, diffLines, propose } from "../src/cowrite.ts";

const NOTE = `---
pov: "[[Elena]]"
---
Elena abrió la puerta.
La casa estaba fría.
Nadie contestó.`;

const CONTEXT = { secciones: [{ nombre: "skills", texto: "- [error] Sin adverbios (global)" }], total: 32, recortadas: [] };

/** Mock provider: records each prompt and answers with a fixed text. */
function mockProvider(reply) {
	const prompts = [];
	return { prompts, complete: async (prompt) => (prompts.push(prompt), reply) };
}

test("diffLines marca líneas iguales, quitadas y añadidas", () => {
	assert.deepEqual(diffLines("a\nb\nc", "a\nx\nc\nd"), [
		{ tipo: "igual", texto: "a" },
		{ tipo: "quitar", texto: "b" },
		{ tipo: "añadir", texto: "x" },
		{ tipo: "igual", texto: "c" },
		{ tipo: "añadir", texto: "d" },
	]);
	assert.deepEqual(diffLines("a\r\nb", "a\nb"), [
		{ tipo: "igual", texto: "a" },
		{ tipo: "igual", texto: "b" },
	]);
});

test("la propuesta se muestra como diff contra el texto actual y conserva el frontmatter", async () => {
	const provider = mockProvider("Elena abrió la puerta.\nLa casa olía a humo.\nNadie contestó.");
	const proposal = await propose(provider, "alternativa", NOTE, CONTEXT);
	assert.equal(proposal.actual, NOTE);
	assert.ok(proposal.propuesta.startsWith('---\npov: "[[Elena]]"\n---\n'));
	assert.deepEqual(
		proposal.diff.filter((line) => line.tipo !== "igual"),
		[
			{ tipo: "quitar", texto: "La casa estaba fría." },
			{ tipo: "añadir", texto: "La casa olía a humo." },
		],
	);
	assert.match(provider.prompts[0], /Sin adverbios/);
	assert.match(provider.prompts[0], /La casa estaba fría\./);
});

test("continuación añade el texto al final sin tocar lo anterior", async () => {
	const proposal = await propose(mockProvider("  Sonó un teléfono.\n"), "continuacion", NOTE, CONTEXT);
	assert.equal(proposal.propuesta, `${NOTE}\n\nSonó un teléfono.`);
	assert.ok(proposal.diff.every((line) => line.tipo !== "quitar"));
});

test("una respuesta vacía del proveedor falla y no deja propuesta", async () => {
	await assert.rejects(propose(mockProvider("  \n"), "borrador", NOTE, CONTEXT), /vacía/);
});

test("rechazar no modifica la nota; aprobar la aplica y queda en el historial de la sesión", async () => {
	const session = new CoWriteSession();
	const proposal = await propose(mockProvider("Otra escena."), "borrador", NOTE, CONTEXT);

	assert.equal(session.rechazar(proposal), NOTE);
	assert.equal(session.historial.length, 1);
	assert.equal(session.historial[0].decision, "rechazada");

	const applied = session.aprobar(proposal, NOTE);
	assert.equal(applied, proposal.propuesta);
	assert.equal(session.historial.length, 2);
	assert.deepEqual(
		{ ...session.historial[1], fecha: undefined },
		{ modo: "borrador", decision: "aprobada", antes: NOTE, despues: proposal.propuesta, fecha: undefined },
	);
	assert.ok(session.historial[1].fecha instanceof Date);
});

test("aprobar falla si la nota cambió desde la propuesta y no registra nada", async () => {
	const session = new CoWriteSession();
	const proposal = await propose(mockProvider("Otra escena."), "borrador", NOTE, CONTEXT);
	assert.throws(() => session.aprobar(proposal, `${NOTE}\nUna línea nueva.`), /cambió/);
	assert.equal(session.historial.length, 0);
});

test("una escena larga no deja fuera las skills ni las fichas del prompt", async () => {
	const escena = `---\npov: "[[Elena]]"\n---\n${"Elena caminó por el pasillo. ".repeat(330)}`;
	assert.ok(escena.length > 9000);
	const contexto = coWriteContext({
		capitulo: 1,
		escena,
		skills: [{ nombre: "Sin adverbios", alcance: "global", aplica_a: [], severidad: "error", verificacion: "ia" }],
		personajes: [{ nombre: "Elena", alias: [], relaciones: [] }],
		objetos: [],
		lugares: [],
		memorias: [],
		resumenes: [],
		trama: "",
		presupuesto: 8000,
	});
	assert.deepEqual(contexto.recortadas, []);
	const provider = mockProvider("Otra escena.");
	await propose(provider, "alternativa", escena, contexto);
	assert.match(provider.prompts[0], /Sin adverbios/);
	assert.match(provider.prompts[0], /Personaje: Elena/);
	assert.ok(provider.prompts[0].includes(escena.slice(-200)));
});

test("aprobar en una nota CRLF conserva los finales de línea", async () => {
	const crlf = NOTE.replace(/\n/g, "\r\n");
	const alternativa = await propose(mockProvider("Otra escena.\nOtra línea."), "alternativa", crlf, CONTEXT);
	assert.equal(alternativa.propuesta, '---\r\npov: "[[Elena]]"\r\n---\r\nOtra escena.\r\nOtra línea.');
	const continuacion = await propose(mockProvider("Sonó un teléfono."), "continuacion", crlf, CONTEXT);
	assert.equal(continuacion.propuesta, `${crlf}\r\n\r\nSonó un teléfono.`);
});

test("si el modelo devuelve su propio frontmatter, el diff lo muestra como líneas añadidas antes de aprobar", async () => {
	const session = new CoWriteSession();
	const proposal = await propose(mockProvider('---\npov: "[[Marta]]"\n---\nOtra escena.'), "borrador", NOTE, CONTEXT);
	// Hoy no se quita: la nota quedaría con dos bloques. Lo que se fija aquí es que no es silencioso.
	assert.ok(proposal.propuesta.startsWith('---\npov: "[[Elena]]"\n---\n---\npov: "[[Marta]]"\n---\n'));
	assert.deepEqual(
		proposal.diff.filter((line) => line.tipo === "añadir").map((line) => line.texto),
		["---", 'pov: "[[Marta]]"', "---", "Otra escena."],
	);
	assert.equal(session.rechazar(proposal), NOTE);
});

test("aprobar dos veces la misma propuesta falla la segunda y registra una sola entrada", async () => {
	const session = new CoWriteSession();
	const proposal = await propose(mockProvider("Otra escena."), "alternativa", NOTE, CONTEXT);
	const applied = session.aprobar(proposal, NOTE);
	assert.throws(() => session.aprobar(proposal, applied), /cambió/);
	assert.equal(session.historial.length, 1);
});
