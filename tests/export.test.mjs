import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	assembleMarkdown,
	docxFile,
	exportFormats,
	exportManuscript,
	manuscriptScenes,
	pandocArgs,
	sceneOrder,
} from "../src/export.ts";

const INDEX = `---
longform:
  format: scenes
  title: "Mi Novela"
  sceneFolder: Manuscrito
  scenes:
    - Cap 02
    - - Escena hija
    - Cap 01
  ignoredFiles: []
atlas:
  version: 1
---
Notas del índice.
`;

const SCENES = {
	"Novela/Manuscrito/Cap 01.md": "---\npov: \"[[Elena]]\"\n---\nElena llega al [[Puerto|puerto]].\n\nLlueve & hace frío.\n",
	"Novela/Manuscrito/Cap 02.md": "Primero va esta.\n",
	"Novela/Manuscrito/Escena hija.md": "Luego la hija <b>.\n",
};

test("el orden de escenas sale del índice Longform, anidadas aplanadas", () => {
	assert.deepEqual(sceneOrder(INDEX), {
		titulo: "Mi Novela",
		carpeta: "Manuscrito",
		escenas: ["Cap 02", "Escena hija", "Cap 01"],
	});
	assert.deepEqual(sceneOrder("---\nlongform:\n  scenes: [\"A, B\", C]\n---\n").escenas, ["A, B", "C"]);
	assert.equal(sceneOrder("Sin frontmatter"), null);
	assert.equal(sceneOrder("---\ntipo: personaje\n---\n"), null);
});

test("ensambla el manuscrito en el orden del índice sin pandoc", async () => {
	const read = async (path) => {
		if (!(path in SCENES)) throw new Error(`no existe ${path}`);
		return SCENES[path];
	};
	const { escenas, faltan } = await manuscriptScenes("Novela/Mi Novela.md", sceneOrder(INDEX), read);
	assert.deepEqual(
		escenas.map((scene) => scene.titulo),
		["Cap 02", "Escena hija", "Cap 01"],
	);
	assert.deepEqual(faltan, []);
	assert.equal(escenas[2].texto, "Elena llega al [[Puerto|puerto]].\n\nLlueve & hace frío.");

	const markdown = assembleMarkdown(escenas);
	assert.ok(markdown.indexOf("# Cap 02") < markdown.indexOf("# Escena hija"));
	assert.ok(markdown.indexOf("# Escena hija") < markdown.indexOf("# Cap 01"));
	assert.match(markdown, /Elena llega al puerto\./);
	assert.doesNotMatch(markdown, /pov:/);

	const missing = await manuscriptScenes("Novela/Mi Novela.md", { ...sceneOrder(INDEX), escenas: ["Cap 01", "Borrada"] }, read);
	assert.deepEqual(missing.faltan, ["Borrada"]);
	assert.equal(missing.escenas.length, 1);
});

test("el DOCX es un zip válido que Word abre, con el texto en orden", () => {
	const escenas = [
		{ titulo: "Cap 02", texto: "Primero va esta." },
		{ titulo: "Cap 01", texto: "Elena llega al [[Puerto|puerto]].\n\nLlueve & hace <frío>." },
	];
	const data = docxFile(escenas);
	assert.ok(data instanceof Uint8Array);

	const dir = mkdtempSync(join(tmpdir(), "atlas-docx-"));
	const file = join(dir, "novela.docx");
	writeFileSync(file, data);
	const check = spawnSync("unzip", ["-tq", file], { encoding: "utf8" });
	assert.equal(check.status, 0, check.stdout + check.stderr);
	const list = spawnSync("unzip", ["-Z1", file], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
	assert.deepEqual(list.sort(), ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]);
	const xml = spawnSync("unzip", ["-p", file, "word/document.xml"], { encoding: "utf8" }).stdout;
	assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8" standalone="yes"\?>/);
	assert.ok(xml.indexOf("Cap 02") < xml.indexOf("Cap 01"));
	assert.match(xml, /Elena llega al puerto\./);
	assert.match(xml, /Llueve &amp; hace &lt;frío&gt;\./);
	const types = spawnSync("unzip", ["-p", file, "[[]Content_Types].xml"], { encoding: "utf8" }).stdout;
	assert.match(types, /wordprocessingml\.document\.main\+xml/);
});

test("sin pandoc solo se ofrece DOCX y EPUB/PDF avisan claro", async () => {
	assert.deepEqual(exportFormats(false), ["docx"]);
	assert.deepEqual(exportFormats(true), ["docx", "epub", "pdf"]);

	const written = [];
	const io = { writeBinary: async (path, data) => written.push([path, data]), pandoc: null };
	const escenas = [{ titulo: "Cap 01", texto: "Hola." }];

	const docx = await exportManuscript("docx", "Mi Novela", escenas, "Exportar", io);
	assert.equal(docx.ok, true);
	assert.equal(written[0][0], "Exportar/Mi Novela.docx");
	assert.equal(docx.ruta, "Exportar/Mi Novela.docx");

	const slash = await exportManuscript("docx", "Antes/Después: 2", escenas, "Exportar", io);
	assert.equal(slash.ruta, "Exportar/Antes-Después- 2.docx");

	const epub = await exportManuscript("epub", "Mi Novela", escenas, "Exportar", io);
	assert.equal(epub.ok, false);
	assert.match(epub.mensaje, /pandoc/);
	assert.match(epub.mensaje, /DOCX/);
	assert.equal(written.length, 2);
});

test("con pandoc, EPUB y PDF pasan el manuscrito por stdin", async () => {
	const calls = [];
	const io = {
		writeBinary: async () => assert.fail("no escribe binario"),
		pandoc: async (args, input) => calls.push({ args, input }),
	};
	const escenas = [{ titulo: "Cap 01", texto: "Hola." }];
	const epub = await exportManuscript("epub", "Mi Novela", escenas, "Novela/Exportar", io);
	assert.equal(epub.ok, true);
	assert.equal(epub.ruta, "Novela/Exportar/Mi Novela.epub");
	assert.deepEqual(calls[0].args, pandocArgs("Mi Novela", "Novela/Exportar/Mi Novela.epub"));
	assert.match(calls[0].input, /# Cap 01\n\nHola\./);

	const failing = { ...io, pandoc: async () => { throw new Error("pdflatex not found"); } };
	const pdf = await exportManuscript("pdf", "Mi Novela", escenas, "", failing);
	assert.equal(pdf.ok, false);
	assert.match(pdf.mensaje, /pdflatex not found/);

	assert.deepEqual(pandocArgs("Mi Novela", "out.pdf"), [
		"--from",
		"markdown",
		"--metadata",
		"title=Mi Novela",
		"--output",
		"out.pdf",
	]);
});
