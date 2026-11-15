import { frontmatterBody, frontmatterEnd, splitOutsideQuotes, unquote } from "./frontmatter.ts";
import { childPath, parentPath } from "./vault.ts";

export type ExportFormat = "docx" | "epub" | "pdf";

export interface ExportScene {
	titulo: string;
	texto: string;
}

export interface SceneOrder {
	titulo: string;
	/** Scene folder relative to the index note; "" is the index's own folder. */
	carpeta: string;
	/** Scene note names in index order; Longform's nested scenes come flattened. */
	escenas: string[];
}

export const NO_SCENES = "Ninguna escena del índice tiene nota: no se exportó nada.";

export const NO_PANDOC = "EPUB y PDF necesitan pandoc instalado (https://pandoc.org). DOCX sigue disponible.";

/** Formats on offer: DOCX always, EPUB and PDF only with pandoc. */
export function exportFormats(hasPandoc: boolean): ExportFormat[] {
	return hasPandoc ? ["docx", "epub", "pdf"] : ["docx"];
}

/** Title, scene folder and scene order from a Longform index note; null when it has no `longform:`. */
export function sceneOrder(indexNote: string): SceneOrder | null {
	const lines = frontmatterBody(indexNote).split("\n");
	const start = lines.findIndex((line) => line.trimEnd() === "longform:");
	if (start === -1) {
		return null;
	}
	const block: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (line.length > 0 && !/^\s/.test(line)) {
			break;
		}
		block.push(line);
	}
	const field = (key: string) => {
		for (const line of block) {
			const match = new RegExp(`^(\\s+)${key}:[ \\t]*(.*)$`).exec(line);
			if (match) {
				return { indent: (match[1] ?? "").length, value: (match[2] ?? "").trim() };
			}
		}
		return null;
	};
	const scenes = field("scenes");
	const escenas: string[] = [];
	if (scenes && scenes.value.startsWith("[") && scenes.value.endsWith("]")) {
		escenas.push(...splitOutsideQuotes(scenes.value.slice(1, -1)).map(unquote));
	} else if (scenes) {
		const at = block.findIndex((line) => /^\s+scenes:/.test(line));
		for (const line of block.slice(at + 1)) {
			const item = /^(\s*)(?:-\s+)+(.*)$/.exec(line);
			if (!item || (item[1] ?? "").length < scenes.indent) {
				break;
			}
			escenas.push(unquote(item[2] ?? ""));
		}
	}
	return {
		titulo: unquote(field("title")?.value ?? ""),
		// Longform's default `/` (or none) means the index's own folder.
		carpeta: unquote(field("sceneFolder")?.value ?? "")
			.replace(/^\/+|\/+$/g, "")
			.replace(/^\.$/, ""),
		escenas: escenas.filter((name) => name.length > 0),
	};
}

/** Scene text without its frontmatter (keys with spaces too, as Properties writes them), trimmed. */
function sceneText(note: string): string {
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	return lines.slice(frontmatterEnd(lines) + 1).join("\n").trim();
}

/** Scene notes next to the index, in index order, frontmatter stripped; `faltan` names the missing ones. */
export async function manuscriptScenes(
	indexPath: string,
	order: SceneOrder,
	read: (path: string) => Promise<string>,
): Promise<{ escenas: ExportScene[]; faltan: string[] }> {
	const parent = parentPath(indexPath);
	const folder = order.carpeta.length > 0 ? childPath(parent, order.carpeta) : parent;
	const escenas: ExportScene[] = [];
	const faltan: string[] = [];
	for (const titulo of order.escenas) {
		try {
			escenas.push({ titulo, texto: sceneText(await read(childPath(folder, `${titulo}.md`))) });
		} catch {
			faltan.push(titulo);
		}
	}
	return { escenas, faltan };
}

/** `[[nota|alias]]` and `[[nota#ancla]]` read as plain text; `![[...]]` embeds are dropped. */
function plainLinks(text: string): string {
	return text
		.replace(/!\[\[[^\]]*\]\]/g, "")
		.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
		.replace(/\[\[([^\]#]*)#\^?([^\]]*)\]\]/g, (_, nota: string, ancla: string) => nota || ancla)
		.replace(/\[\[([^\]]+)\]\]/g, "$1");
}

/** One Markdown manuscript: a `#` heading per scene, wikilinks as plain text. */
export function assembleMarkdown(escenas: ExportScene[]): string {
	return escenas.map((scene) => `# ${scene.titulo}\n\n${plainLinks(scene.texto)}\n`).join("\n");
}

/** Where pandoc lives when the app's PATH misses it: Homebrew on Apple silicon, then Intel and the official .pkg. */
const PANDOC_PATHS = ["pandoc", "/opt/homebrew/bin/pandoc", "/usr/local/bin/pandoc"];

/** First pandoc binary that `works`, or null. A macOS app opened from the Dock does not see the shell PATH. */
export async function pandocBinary(works: (bin: string) => Promise<boolean>): Promise<string | null> {
	for (const bin of PANDOC_PATHS) {
		if (await works(bin)) {
			return bin;
		}
	}
	return null;
}

/** `-raw_html`: a literal `<raro>` in a scene stays text instead of vanishing as unknown HTML. */
export function pandocArgs(titulo: string, output: string): string[] {
	return ["--from", "markdown-raw_html", "--metadata", `title=${titulo}`, "--output", output];
}

export interface ExportIO {
	writeBinary(path: string, data: Uint8Array): Promise<void>;
	/** Runs pandoc from the vault root with `input` on stdin; null when pandoc is not installed. */
	pandoc: ((args: string[], input: string) => Promise<void>) | null;
}

export type ExportResult = { ok: true; ruta: string } | { ok: false; mensaje: string };

export async function exportManuscript(
	format: ExportFormat,
	titulo: string,
	escenas: ExportScene[],
	folder: string,
	io: ExportIO,
): Promise<ExportResult> {
	if (escenas.length === 0) {
		return { ok: false, mensaje: NO_SCENES };
	}
	const ruta = childPath(folder, `${titulo.replace(/[\\/:*?"<>|]/g, "-")}.${format}`);
	if (format === "docx") {
		await io.writeBinary(ruta, docxFile(escenas));
		return { ok: true, ruta };
	}
	if (!io.pandoc) {
		return { ok: false, mensaje: NO_PANDOC };
	}
	try {
		await io.pandoc(pandocArgs(titulo, ruta), assembleMarkdown(escenas));
	} catch (error) {
		return { ok: false, mensaje: `pandoc falló: ${error instanceof Error ? error.message : String(error)}` };
	}
	return { ok: true, ruta };
}

/** Notice text for an export, naming the scenes skipped for having no note. */
export function exportMessage(result: ExportResult, faltan: string[]): string {
	const head = result.ok ? `Exportado: ${result.ruta}` : result.mensaje;
	return faltan.length > 0 ? `${head}\nSin nota, se saltaron: ${faltan.join(", ")}.` : head;
}

/** Characters XML 1.0 forbids; one of them leaves document.xml unreadable. */
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g;

function xmlText(text: string): string {
	return text
		.replace(XML_ILLEGAL, "")
		.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A heading is bold 16 pt with outline level 0, so Word's navigation pane lists it. */
function paragraph(text: string, heading = false): string {
	const outline = heading ? '<w:pPr><w:outlineLvl w:val="0"/></w:pPr>' : "";
	const props = heading ? '<w:rPr><w:b/><w:sz w:val="32"/></w:rPr>' : "";
	const runs = text
		.split(/\r?\n/)
		.map((line) => `<w:t xml:space="preserve">${xmlText(line)}</w:t>`)
		.join("<w:br/>");
	return `<w:p>${outline}<w:r>${props}${runs}</w:r></w:p>`;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** Minimal WordprocessingML package: one heading per scene, one paragraph per blank-line block. */
export function docxFile(escenas: ExportScene[]): Uint8Array {
	const body = escenas
		.map((scene, at) => {
			const blocks = plainLinks(scene.texto)
				.split(/\n\s*\n/)
				.map((block) => block.trim())
				.filter((block) => block.length > 0);
			const pageBreak = at > 0 ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : "";
			return pageBreak + paragraph(scene.titulo, true) + blocks.map((block) => paragraph(block)).join("");
		})
		.join("");
	const document = `${XML_HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
	const types = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
	const rels = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
	return zipStored([
		["[Content_Types].xml", types],
		["_rels/.rels", rels],
		["word/document.xml", document],
	]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	return c >>> 0;
});

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) {
		crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP archive with every entry stored (no compression), UTF-8 names. */
function zipStored(entries: [string, string][]): Uint8Array {
	const encoder = new TextEncoder();
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;
	for (const [name, text] of entries) {
		const nameBytes = encoder.encode(name);
		const data = encoder.encode(text);
		const crc = crc32(data);
		// version 20, flag 0x0800 (UTF-8 names), method 0 (stored), DOS date 1980-01-01.
		const common = [20, 0x0800, 0, 0, 0x21, crc, data.length, data.length, nameBytes.length, 0];
		const local = header(0x04034b50, [[2, 2, 2, 2, 2, 4, 4, 4, 2, 2], common], nameBytes, data);
		const central = header(
			0x02014b50,
			[[2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4], [20, ...common, 0, 0, 0, 0, offset]],
			nameBytes,
		);
		locals.push(local);
		centrals.push(central);
		offset += local.length;
	}
	const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
	const end = header(0x06054b50, [[2, 2, 2, 2, 4, 4, 2], [0, 0, entries.length, entries.length, centralSize, offset, 0]]);
	return concat([...locals, ...centrals, end]);
}

function header(signature: number, [sizes, values]: [number[], number[]], ...tail: Uint8Array[]): Uint8Array {
	const length = 4 + sizes.reduce((sum, size) => sum + size, 0);
	const view = new DataView(new ArrayBuffer(length));
	view.setUint32(0, signature, true);
	let at = 4;
	sizes.forEach((size, index) => {
		const value = values[index] ?? 0;
		if (size === 2) {
			view.setUint16(at, value, true);
		} else {
			view.setUint32(at, value, true);
		}
		at += size;
	});
	return concat([new Uint8Array(view.buffer), ...tail]);
}

function concat(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let at = 0;
	for (const part of parts) {
		out.set(part, at);
		at += part.length;
	}
	return out;
}
