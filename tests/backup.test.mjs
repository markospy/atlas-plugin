import assert from "node:assert/strict";
import test from "node:test";

import { backup, backupFolder, listBackups, RETENTION, restore } from "../src/backup.ts";

/** In-memory adapter: files by path, folders as a set. */
function memoryFiles() {
	const files = new Map();
	const folders = new Set();
	return {
		files,
		folders,
		exists: async (path) => files.has(path) || folders.has(path),
		mkdir: async (path) => {
			folders.add(path);
		},
		read: async (path) => {
			if (!files.has(path)) throw new Error(`no existe ${path}`);
			return files.get(path);
		},
		write: async (path, data) => {
			files.set(path, data);
		},
		list: async (folder) => [...files.keys()].filter((path) => path.startsWith(`${folder}/`) && !path.slice(folder.length + 1).includes("/")),
		remove: async (path) => {
			files.delete(path);
		},
	};
}

const NOTE = "Novela/Manuscrito/Cap 01.md";
const DAY = 24 * 60 * 60 * 1000;
const at = (iso) => new Date(iso);

test("backupFolder: una carpeta oculta por nota, sin la extensión", () => {
	assert.equal(backupFolder(NOTE), ".atlas/respaldos/Novela/Manuscrito/Cap 01");
});

test("backup: guarda el texto y se puede leer igual", async () => {
	const fs = memoryFiles();
	const path = await backup(fs, NOTE, "Elena abrió la puerta.\r\n", at("2026-11-15T10:30:00.000Z"));
	assert.equal(path, ".atlas/respaldos/Novela/Manuscrito/Cap 01/2026-11-15T10-30-00.000Z.md");
	assert.equal(fs.files.get(path), "Elena abrió la puerta.\r\n");
	assert.ok(fs.folders.has(".atlas/respaldos/Novela/Manuscrito/Cap 01"));
});

test("backup: dos copias en el mismo milisegundo no se pisan", async () => {
	const fs = memoryFiles();
	const now = at("2026-11-15T10:30:00.000Z");
	const first = await backup(fs, NOTE, "uno", now);
	const second = await backup(fs, NOTE, "dos", now);
	assert.notEqual(first, second);
	assert.equal(fs.files.get(first), "uno");
	assert.equal(fs.files.get(second), "dos");
});

test("listBackups: versiones de la nota, la más nueva primero, con su fecha", async () => {
	const fs = memoryFiles();
	await backup(fs, NOTE, "viejo", at("2026-11-14T08:00:00.000Z"));
	await backup(fs, NOTE, "nuevo", at("2026-11-15T09:00:00.000Z"));
	await backup(fs, "Novela/Manuscrito/Cap 02.md", "otra nota", at("2026-11-15T09:30:00.000Z"));
	const versions = await listBackups(fs, NOTE);
	assert.deepEqual(
		versions.map((version) => version.fecha.toISOString()),
		["2026-11-15T09:00:00.000Z", "2026-11-14T08:00:00.000Z"],
	);
	assert.deepEqual(await listBackups(fs, "Novela/Nada.md"), []);
});

test("restore: devuelve el texto de la versión elegida y respalda antes el texto actual", async () => {
	const fs = memoryFiles();
	await backup(fs, NOTE, "versión 1", at("2026-11-15T08:00:00.000Z"));
	await backup(fs, NOTE, "versión 2", at("2026-11-15T09:00:00.000Z"));
	const [, older] = await listBackups(fs, NOTE);
	const text = await restore(fs, NOTE, older.path, "texto de ahora", at("2026-11-15T10:00:00.000Z"));
	assert.equal(text, "versión 1");
	const [newest] = await listBackups(fs, NOTE);
	assert.equal(fs.files.get(newest.path), "texto de ahora");
});

test("restore: una ruta de otra nota no se restaura", async () => {
	const fs = memoryFiles();
	const other = await backup(fs, "Novela/Manuscrito/Cap 02.md", "ajeno", at("2026-11-15T08:00:00.000Z"));
	await assert.rejects(restore(fs, NOTE, other, "ahora", at("2026-11-15T09:00:00.000Z")), /no es un respaldo de esta nota/);
});

test("retención: como mucho N versiones por nota, se borran las más viejas", async () => {
	const fs = memoryFiles();
	const start = at("2026-11-15T00:00:00.000Z").getTime();
	for (let i = 0; i < RETENTION.maxVersiones + 3; i++) {
		await backup(fs, NOTE, `v${i}`, new Date(start + i * 60_000));
	}
	const versions = await listBackups(fs, NOTE);
	assert.equal(versions.length, RETENTION.maxVersiones);
	assert.equal(fs.files.get(versions[0].path), `v${RETENTION.maxVersiones + 2}`);
	assert.equal(fs.files.get(versions.at(-1).path), "v3");
});

test("retención: al respaldar se borran las versiones de más de N días", async () => {
	const fs = memoryFiles();
	const now = at("2026-11-15T12:00:00.000Z").getTime();
	await backup(fs, NOTE, "muy vieja", new Date(now - (RETENTION.maxDias + 2) * DAY));
	await backup(fs, NOTE, "vieja", new Date(now - (RETENTION.maxDias + 1) * DAY));
	await backup(fs, NOTE, "reciente", new Date(now - DAY));
	await backup(fs, NOTE, "hoy", new Date(now));
	assert.deepEqual(
		(await listBackups(fs, NOTE)).map((version) => fs.files.get(version.path)),
		["hoy", "reciente"],
	);
});

test("retención: la versión más nueva se queda aunque el reloj vaya hacia atrás", async () => {
	const fs = memoryFiles();
	await backup(fs, NOTE, "futura", at("2026-12-31T00:00:00.000Z"));
	await backup(fs, NOTE, "ahora", at("2026-11-15T00:00:00.000Z"));
	assert.deepEqual(
		(await listBackups(fs, NOTE)).map((version) => fs.files.get(version.path)),
		["futura", "ahora"],
	);
});

test("retención: los archivos que no son respaldos no se tocan", async () => {
	const fs = memoryFiles();
	const folder = backupFolder(NOTE);
	fs.files.set(`${folder}/LEEME.txt`, "mío");
	await backup(fs, NOTE, "v", at("2026-11-15T08:00:00.000Z"));
	assert.equal(fs.files.get(`${folder}/LEEME.txt`), "mío");
	assert.equal((await listBackups(fs, NOTE)).length, 1);
});
