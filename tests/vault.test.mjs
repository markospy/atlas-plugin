import assert from "node:assert/strict";
import test from "node:test";

import { createAtlasProject, PROJECT_FOLDERS } from "../src/vault.ts";

function memoryFiles(seed = {}) {
	const files = new Map(Object.entries(seed));
	const folders = new Set();
	return {
		files,
		folders,
		async exists(path) {
			return files.has(path) || folders.has(path);
		},
		async createFolder(path) {
			folders.add(path);
		},
		async read(path) {
			if (!files.has(path)) throw new Error(`no existe ${path}`);
			return files.get(path);
		},
		async write(path, data) {
			files.set(path, data);
		},
	};
}

test("crea el árbol y el índice Longform sin pisar lo que ya existe", async () => {
	const vault = memoryFiles({
		"Novela/Mi Novela.md": "Capítulos por escribir.\n",
		"Novela/Manuscrito/Cap 01.md": "Texto ya escrito.\n",
	});
	vault.folders.add("Novela/Manuscrito");

	await createAtlasProject(vault, "Novela/Mi Novela.md");

	for (const folder of PROJECT_FOLDERS) {
		assert.equal(vault.folders.has(`Novela/${folder}`), true, folder);
	}
	assert.equal(vault.files.get("Novela/Manuscrito/Cap 01.md"), "Texto ya escrito.\n");

	const index = vault.files.get("Novela/Mi Novela.md");
	assert.match(index, /^---\n/);
	assert.match(index, /longform:/);
	assert.match(index, /format: scenes/);
	assert.match(index, /sceneFolder: Manuscrito/);
	assert.match(index, /scenes: \[\]/);
	assert.match(index, /atlas:\n {2}version: 1/);
	assert.match(index, /Capítulos por escribir\.\n$/);

	const written = index;
	await createAtlasProject(vault, "Novela/Mi Novela.md");
	assert.equal(vault.files.get("Novela/Mi Novela.md"), written);
});
