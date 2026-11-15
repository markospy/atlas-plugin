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
