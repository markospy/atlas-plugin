import assert from "node:assert/strict";
import test from "node:test";

import { frontmatterEnd } from "../src/frontmatter.ts";

const end = (text) => frontmatterEnd(text.split("\n"));

test("frontmatterEnd: YAML con comentario, clave con espacios, lista y vacío es frontmatter", () => {
	assert.equal(end("---\n# a mano\nmi nota: x\nhechos:\n  - id: a\n\n---\ncuerpo"), 6);
	assert.equal(end("---\n---\ncuerpo"), 1);
});

test("frontmatterEnd: un --- de escena, sin cierre o sin apertura no es frontmatter", () => {
	assert.equal(end("---\nEl capítulo empieza.\n---\nmás"), -1);
	assert.equal(end("---\ntipo: memoria\n"), -1);
	assert.equal(end("tipo: memoria\n---\n"), -1);
});

test("frontmatterEnd y frontmatterBody aceptan un cierre --- con espacios al final", async () => {
	const { frontmatterBody } = await import("../src/frontmatter.ts");
	assert.equal(end("---\ntipo: memoria\n---  \ncuerpo"), 2);
	assert.equal(frontmatterBody("---\ntipo: memoria\n---  \ncuerpo"), "tipo: memoria");
	assert.equal(frontmatterBody("---\ntipo: memoria\n----\nb: 1\n---\n"), "tipo: memoria\n----\nb: 1", "---- no cierra");
});

// #70 R1: un frontmatter que no es YAML válido sigue siendo frontmatter; solo el escritor se niega.
test("frontmatterEnd conserva el cierre de un frontmatter que no es YAML válido", async () => {
	const { frontmatterYaml } = await import("../src/frontmatter.ts");
	const nota = "---\ntitulo: Capítulo 1: El inicio\n---\nTexto";
	assert.equal(end(nota), 2);
	assert.deepEqual({ ...frontmatterYaml(nota.split("\n")), doc: null }, { end: 2, doc: null, invalid: true });
});

// #70 R3: los escalares se leen como texto, tal como los escribió el autor.
test("mapList lee ids como 007 o 1e3 tal como están escritos", async () => {
	const { mapList } = await import("../src/frontmatter.ts");
	assert.deepEqual(mapList("hechos:\n  - id: 007\n  - id: 1e3\n  - id: true", "hechos"), [{ id: "007" }, { id: "1e3" }, { id: "true" }]);
});
