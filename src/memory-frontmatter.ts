import { isMap, parseDocument, type Document } from "yaml";

import { mapList } from "./frontmatter.ts";

/**
 * YAML reader for the notes that approval writes to (`_Memoria/` and the `estados` of a place).
 * The common reader in `frontmatter.ts`, which export and the other notes use, stays as it is.
 */

/** Every scalar reads as the text the author wrote: no numbers, booleans or dates. */
const FAILSAFE = { schema: "failsafe" } as const;

/**
 * Closing line and parsed YAML of a note's frontmatter (`lines` split on LF). The block opens with
 * `---` on line 0 and closes on the next `---` line, trailing spaces allowed as Obsidian reads it.
 * `end` is -1 when there is none: no closing line, or valid YAML that is not a map (a `---` scene
 * break). `invalid` marks a block that is not valid YAML at all: `doc` is null so a writer
 * refuses instead of guessing.
 */
export function memoryFrontmatter(lines: readonly string[]): { end: number; doc: Document.Parsed | null; invalid: boolean } {
	const end = lines[0] === "---" ? lines.findIndex((line, at) => at > 0 && line.trimEnd() === "---") : -1;
	if (end === -1) {
		return { end: -1, doc: null, invalid: false };
	}
	const doc = parseDocument(lines.slice(1, end).join("\n"), FAILSAFE);
	if (doc.errors.length > 0) {
		return { end, doc: null, invalid: true };
	}
	return doc.contents === null || isMap(doc.contents) ? { end, doc, invalid: false } : { end: -1, doc: null, invalid: false };
}

/** Frontmatter text of a memory note, as `memoryFrontmatter` bounds it; "" when there is none. */
export function memoryFrontmatterBody(note: string): string {
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	const { end } = memoryFrontmatter(lines);
	return end === -1 ? "" : lines.slice(1, end).join("\n");
}

/**
 * Items of a top-level list of maps, read as YAML (block or flow, one line or several), values as
 * written (failsafe schema). Frontmatter that is not valid YAML falls back to the common `mapList`.
 */
export function memoryMapList(frontmatter: string, key: string): Record<string, string>[] {
	const doc = parseDocument(frontmatter, FAILSAFE);
	if (doc.errors.length > 0) {
		return mapList(frontmatter, key);
	}
	const value: unknown = isMap(doc.contents) ? doc.toJS()[key] : undefined;
	return Array.isArray(value) ? value.filter(isRecord).map((item) => Object.fromEntries(Object.entries(item).map(([field, v]) => [field, text(v)]))) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	// An unquoted `[[Link]]` reads as YAML as a list in a list; keep it a link, as written.
	if (Array.isArray(value) && value.length === 1 && Array.isArray(value[0]) && value[0].length === 1) {
		return `[[${String(value[0][0])}]]`;
	}
	return typeof value === "object" ? JSON.stringify(value) : String(value);
}
