import { test } from "node:test";
import assert from "node:assert/strict";

const { memoryFrontmatter, memoryFrontmatterBody, memoryMapList } = await import("../src/memory-frontmatter.ts");
const split = (note) => note.split("\n");

// #70: el lector de _Memoria/ acepta un cierre --- con espacios al final, como Obsidian.
test("memoryFrontmatter acepta un cierre --- con espacios al final", () => {
	assert.equal(memoryFrontmatter(split("---\ntipo: memoria\n---  \ncuerpo")).end, 2);
	assert.equal(memoryFrontmatterBody("---\ntipo: memoria\n---  \ncuerpo"), "tipo: memoria");
	assert.equal(memoryFrontmatterBody("---\ntipo: memoria\n----\nb: 1\n---\n"), "tipo: memoria\n----\nb: 1", "---- no cierra");
});

// #70 R1: un frontmatter que no es YAML válido conserva su cierre; el escritor se niega con `invalid`.
test("memoryFrontmatter marca un frontmatter que no es YAML válido", () => {
	assert.deepEqual({ ...memoryFrontmatter(split("---\ntitulo: Capítulo 1: El inicio\n---\nTexto")), doc: null }, { end: 2, doc: null, invalid: true });
});

test("memoryFrontmatter: un --- de escena que es YAML pero no un mapa no es frontmatter", () => {
	assert.equal(memoryFrontmatter(split("---\nUna línea suelta\n---\nTexto")).end, -1);
});

// #70 R3: los escalares se leen como texto, tal como los escribió el autor.
test("memoryMapList lee ids como 007 o 1e3 tal como están escritos", () => {
	assert.deepEqual(memoryMapList("hechos:\n  - id: 007\n  - id: 1e3\n  - id: true", "hechos"), [{ id: "007" }, { id: "1e3" }, { id: "true" }]);
});
