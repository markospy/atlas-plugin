import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	assembleMarkdown,
	docxFile,
	exportFormats,
	exportManuscript,
	exportMessage,
	manuscriptScenes,
	pandocArgs,
	pandocBinary,
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

test("quita el frontmatter con claves de Properties con espacios (R6)", async () => {
	const notes = {
		"Novela/Manuscrito/Cap 01.md": "---\nFecha escena: 2020-01-01\npov: Ana\n---\nTexto",
		"Novela/Manuscrito/Cap 02.md": "---\nUna línea suelta\n---\nTras una pausa.",
	};
	const { escenas } = await manuscriptScenes("Novela/Mi Novela.md", { ...sceneOrder(INDEX), escenas: ["Cap 01", "Cap 02"] }, async (path) => notes[path]);
	assert.equal(escenas[0].texto, "Texto");
	// A `---` scene break that is not YAML stays as text.
	assert.equal(escenas[1].texto, "---\nUna línea suelta\n---\nTras una pausa.");
});

test("las incrustaciones ![[...]] no salen como texto (R7)", () => {
	const markdown = assembleMarkdown([{ titulo: "Cap 01", texto: "Antes ![[img.png]] y ![[Nota|alias]] después, con [[Ana]]." }]);
	assert.doesNotMatch(markdown, /img\.png|alias|!/);
	assert.match(markdown, /Antes {2}y {2}después, con Ana\./);
	const xml = new TextDecoder().decode(docxFile([{ titulo: "Cap 01", texto: "Ver ![[mapa.jpg]] aquí." }]));
	assert.doesNotMatch(xml, /mapa\.jpg/);
});

test("los enlaces con ancla salen como el nombre de la nota (R13)", () => {
	const markdown = assembleMarkdown([
		{ titulo: "Cap 01", texto: "Ver [[nota#seccion]], [[nota#^bloque]], [[nota#seccion|aquí]] y [[#Final]]." },
	]);
	assert.match(markdown, /Ver nota, nota, aquí y Final\./);
});

test("busca pandoc en el PATH y luego en las rutas de Homebrew de macOS (R10)", async () => {
	const tried = [];
	const only = (ok) => async (bin) => {
		tried.push(bin);
		return bin === ok;
	};
	assert.equal(await pandocBinary(only("pandoc")), "pandoc");
	assert.deepEqual(tried, ["pandoc"]);
	tried.length = 0;
	assert.equal(await pandocBinary(only("/opt/homebrew/bin/pandoc")), "/opt/homebrew/bin/pandoc");
	assert.equal(await pandocBinary(only("/usr/local/bin/pandoc")), "/usr/local/bin/pandoc");
	assert.equal(await pandocBinary(only("nada")), null);
});

test("el encabezado de escena del DOCX tiene nivel de esquema para el panel de navegación (R8)", () => {
	const xml = new TextDecoder().decode(docxFile([{ titulo: "Cap 01", texto: "Hola." }]));
	assert.match(xml, /<w:p><w:pPr><w:outlineLvl w:val="0"\/><\/w:pPr><w:r><w:rPr><w:b\/><w:sz w:val="32"\/><\/w:rPr><w:t xml:space="preserve">Cap 01</);
	assert.match(xml, /<w:p><w:r><w:t xml:space="preserve">Hola\.</);
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
		"markdown-raw_html",
		"--metadata",
		"title=Mi Novela",
		"--output",
		"out.pdf",
	]);
});

test("sceneFolder `/`, vacío o ausente es la carpeta del índice; sin barras sobrantes", async () => {
	const paths = [];
	const read = async (path) => {
		paths.push(path);
		return "Texto.";
	};
	const index = (folder) => `---\nlongform:\n  title: Libro\n${folder}  scenes: [A]\n---\n`;
	for (const folder of ["  sceneFolder: /\n", "  sceneFolder: .\n", "  sceneFolder: \"\"\n", ""]) {
		assert.equal(sceneOrder(index(folder)).carpeta, "", folder);
	}
	assert.equal(sceneOrder(index("  sceneFolder: /Escenas/\n")).carpeta, "Escenas");

	await manuscriptScenes("Libro/Libro.md", sceneOrder(index("  sceneFolder: /\n")), read);
	await manuscriptScenes("Libro/Libro.md", sceneOrder(index("  sceneFolder: /Escenas\n")), read);
	await manuscriptScenes("Libro.md", sceneOrder(index("")), read);
	assert.deepEqual(paths, ["Libro/A.md", "Libro/Escenas/A.md", "A.md"]);
});

test("caracteres de control no rompen el XML del DOCX", () => {
	const dir = mkdtempSync(join(tmpdir(), "atlas-docx-"));
	const file = join(dir, "control.docx");
	writeFileSync(file, docxFile([{ titulo: "Cap\u0001 01", texto: "Hola\u000bmundo\u0000.\r\nOtra\u001f línea\ttab." }]));
	const xml = spawnSync("unzip", ["-p", file, "word/document.xml"], { encoding: "utf8" }).stdout;
	// eslint-disable-next-line no-control-regex
	assert.doesNotMatch(xml, /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
	assert.match(xml, /Holamundo\./);
	assert.match(xml, /Cap 01/);
	assert.match(xml, /Otra línea\ttab\./);
	const parse = spawnSync("python3", ["-c", "import sys,xml.dom.minidom as m;m.parseString(sys.stdin.buffer.read())"], {
		input: xml,
	});
	assert.equal(parse.status, 0, String(parse.stderr));
});

test("sin escenas no exporta, y el aviso conserva las saltadas", async () => {
	const io = { writeBinary: async () => assert.fail("no escribe"), pandoc: null };
	const empty = await exportManuscript("docx", "Mi Novela", [], "Exportar", io);
	assert.equal(empty.ok, false);
	assert.match(empty.mensaje, /ninguna escena/i);
	assert.match(exportMessage(empty, ["A", "B"]), /Sin nota, se saltaron: A, B\./);

	const failing = { writeBinary: async () => {}, pandoc: async () => { throw new Error("boom"); } };
	const pdf = await exportManuscript("pdf", "Mi Novela", [{ titulo: "C", texto: "x" }], "", failing);
	assert.match(exportMessage(pdf, ["Borrada"]), /pandoc falló: boom\nSin nota, se saltaron: Borrada\./);
	assert.equal(exportMessage({ ok: true, ruta: "Exportar/X.docx" }, []), "Exportado: Exportar/X.docx");
});

/** The same runner main.ts builds: pandoc from the vault root, manuscript on stdin. */
function realPandoc(cwd) {
	return (args, input) =>
		new Promise((resolve, reject) => {
			const child = execFile("pandoc", args, { cwd }, (error, _stdout, stderr) => {
				if (error) {
					reject(new Error(String(stderr).trim() || error.message));
					return;
				}
				resolve();
			});
			child.stdin?.end(input);
		});
}

const HAS_PANDOC = spawnSync("pandoc", ["--version"]).status === 0;
const HAS_PDF_ENGINE = spawnSync("pdflatex", ["--version"]).status === 0;

test("con pandoc real, EPUB sale con los capítulos en el orden del índice", { skip: !HAS_PANDOC && "sin pandoc" }, async () => {
	const vault = mkdtempSync(join(tmpdir(), "atlas-epub-"));
	mkdirSync(join(vault, "Novela/Exportar"), { recursive: true });
	const escenas = [
		{ titulo: "Cap 02", texto: "Primero va esta & [[Elena|ella]]." },
		{ titulo: "Cap 01", texto: "Luego <b> esta." },
	];
	const io = { writeBinary: async () => assert.fail("no escribe binario"), pandoc: realPandoc(vault) };
	const result = await exportManuscript("epub", "Mi Novela", escenas, "Novela/Exportar", io);
	assert.deepEqual(result, { ok: true, ruta: "Novela/Exportar/Mi Novela.epub" });
	const file = join(vault, result.ruta);
	const list = spawnSync("unzip", ["-Z1", file], { encoding: "utf8" });
	assert.equal(list.status, 0, list.stderr);
	assert.match(list.stdout, /^mimetype$/m);
	const text = spawnSync("unzip", ["-p", file, "EPUB/text/*.xhtml", "EPUB/content.opf"], { encoding: "utf8" }).stdout;
	assert.match(text, /<dc:title[^>]*>Mi Novela<\/dc:title>/);
	assert.ok(text.indexOf("Cap 02") < text.indexOf("Cap 01"), "Cap 02 antes que Cap 01");
	assert.match(text, /Primero va esta &amp; ella\./);
});

test("con pandoc real, un <raro> literal no se pierde en EPUB (R12)", { skip: !HAS_PANDOC && "sin pandoc" }, async () => {
	const vault = mkdtempSync(join(tmpdir(), "atlas-raw-"));
	const io = { writeBinary: async () => assert.fail("no escribe binario"), pandoc: realPandoc(vault) };
	const result = await exportManuscript("epub", "Mi Novela", [{ titulo: "Cap 01", texto: "Ella dijo <raro> y siguió." }], "", io);
	assert.equal(result.ok, true, result.mensaje);
	const text = spawnSync("unzip", ["-p", join(vault, result.ruta), "EPUB/text/*.xhtml"], { encoding: "utf8" }).stdout;
	assert.match(text, /Ella dijo &lt;raro&gt; y siguió\./);
});

test("con pandoc real, PDF se genera o avisa claro qué motor falta", { skip: !HAS_PANDOC && "sin pandoc" }, async () => {
	const vault = mkdtempSync(join(tmpdir(), "atlas-pdf-"));
	const io = { writeBinary: async () => assert.fail("no escribe binario"), pandoc: realPandoc(vault) };
	const result = await exportManuscript("pdf", "Mi Novela", [{ titulo: "Cap 01", texto: "Hola." }], "", io);
	if (HAS_PDF_ENGINE) {
		assert.equal(result.ok, true, result.mensaje);
		assert.equal(readFileSync(join(vault, result.ruta)).subarray(0, 5).toString(), "%PDF-");
	} else {
		assert.equal(result.ok, false);
		assert.match(result.mensaje, /^pandoc falló: .*pdflatex not found/);
	}
});
