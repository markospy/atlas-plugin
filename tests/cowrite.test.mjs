import assert from "node:assert/strict";
import test from "node:test";

import { CoWriteSession, diffLines, propose } from "../src/cowrite.ts";

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
