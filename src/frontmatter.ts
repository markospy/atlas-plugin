import { isMap, parseDocument, type Document } from "yaml";

/** Every scalar reads as the text the author wrote: no numbers, booleans or dates. */
const FAILSAFE = { schema: "failsafe" } as const;

/** YAML frontmatter between the opening `---` and its closing `---` line, with CRLF read as LF. */
export function frontmatterBody(note: string): string {
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	const close = closingLine(lines);
	return close === -1 ? "" : lines.slice(1, close).join("\n");
}

/**
 * Index of the `---` line (trailing spaces allowed, as Obsidian reads it) that closes a block
 * opened by `---` on line 0, or -1. Reader and writer share it so they agree where it ends.
 */
function closingLine(lines: readonly string[]): number {
	return lines[0] === "---" ? lines.findIndex((line, at) => at > 0 && line.trimEnd() === "---") : -1;
}

/**
 * Note text after its frontmatter, trimmed, with CRLF read as LF. A `---` scene break also
 * opens a note: there is frontmatter only when the next line is a `clave:` line.
 */
export function noteBody(note: string): string {
	const text = note.replace(/\r\n/g, "\n");
	const lines = text.split("\n");
	if (lines[0] !== "---" || !/^[\p{L}\w-]+:(\s|$)/u.test(lines[1] ?? "")) {
		return text.trim();
	}
	const end = closingLine(lines);
	return end === -1 ? text.trim() : lines.slice(end + 1).join("\n").trim();
}

/**
 * Index of the line that closes a note's frontmatter, or -1 when there is none. `lines` is the
 * note split on LF. A `---` scene break also opens notes, so the block counts as frontmatter only
 * when it parses as a YAML map, is empty, or is not valid YAML at all.
 */
export function frontmatterEnd(lines: readonly string[]): number {
	return frontmatterYaml(lines).end;
}

/**
 * Closing line and parsed YAML of a note's frontmatter (`lines` split on LF). `end` is -1 when
 * there is none: no closing line, or valid YAML that is not a map (a `---` scene break).
 * `invalid` marks a block that is not valid YAML at all: it keeps its `end` so readers still strip
 * it, and `doc` is null so a writer refuses instead of guessing. Scalars read as text (failsafe
 * schema), so `id: 007` stays `007`.
 */
export function frontmatterYaml(lines: readonly string[]): { end: number; doc: Document.Parsed | null; invalid: boolean } {
	const end = closingLine(lines);
	if (end === -1) {
		return { end: -1, doc: null, invalid: false };
	}
	const doc = parseDocument(lines.slice(1, end).join("\n"), FAILSAFE);
	if (doc.errors.length > 0) {
		return { end, doc: null, invalid: true };
	}
	return doc.contents === null || isMap(doc.contents) ? { end, doc, invalid: false } : { end: -1, doc: null, invalid: false };
}

/** Value of a top-level `key: value` line, unquoted; "" when missing. */
export function scalar(frontmatter: string, key: string): string {
	const match = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(frontmatter);
	return match ? unquote(match[1] ?? "") : "";
}

/**
 * Items of a top-level list: inline `key: [a, "b, c"]` (commas inside quotes kept),
 * block `key:` + `  - a` lines as Obsidian Properties writes them, or a lone scalar.
 */
export function list(frontmatter: string, key: string): string[] {
	const lines = frontmatter.split("\n");
	const at = lines.findIndex((line) => line.startsWith(`${key}:`));
	if (at === -1) {
		return [];
	}
	const value = (lines[at] ?? "").slice(key.length + 1).trim();
	if (value.startsWith("[") && value.endsWith("]")) {
		return splitOutsideQuotes(value.slice(1, -1)).map(unquote).filter((item) => item.length > 0);
	}
	if (value.length > 0) {
		return [unquote(value)];
	}
	const items: string[] = [];
	for (const line of lines.slice(at + 1)) {
		const item = /^\s+-\s*(.*)$/.exec(line);
		if (!item) {
			break;
		}
		const text = unquote(item[1] ?? "");
		if (text.length > 0) {
			items.push(text);
		}
	}
	return items;
}

/**
 * Items of a top-level list of maps, read as YAML (block or flow, one line or several), values
 * as written (failsafe schema). Frontmatter that is not valid YAML falls back to `key:` then
 * `- field: value` lines with any indent, each item's other fields indented deeper than its dash.
 */
export function mapList(frontmatter: string, key: string): Record<string, string>[] {
	const doc = parseDocument(frontmatter, FAILSAFE);
	if (doc.errors.length === 0) {
		const value: unknown = isMap(doc.contents) ? doc.toJS()[key] : undefined;
		return Array.isArray(value) ? value.filter(isRecord).map((item) => Object.fromEntries(Object.entries(item).map(([field, v]) => [field, text(v)]))) : [];
	}
	const lines = frontmatter.split("\n");
	const start = lines.findIndex((line) => line.trimEnd() === `${key}:`);
	if (start === -1) {
		return [];
	}
	const items: Record<string, string>[] = [];
	let current: Record<string, string> | null = null;
	let itemIndent = -1;
	for (const line of lines.slice(start + 1)) {
		if (line.length > 0 && !/^[\s-]/.test(line)) {
			break;
		}
		const item = /^(\s*)- (\w+):\s*(.*)$/.exec(line);
		if (item) {
			itemIndent = (item[1] ?? "").length;
			current = { [item[2] ?? ""]: unquote(item[3] ?? "") };
			items.push(current);
			continue;
		}
		const field = /^(\s*)(\w+):\s*(.*)$/.exec(line);
		if (field && current && (field[1] ?? "").length > itemIndent) {
			current[field[2] ?? ""] = unquote(field[3] ?? "");
		}
	}
	return items;
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

/** Splits on commas that sit outside quotes. */
export function splitOutsideQuotes(inner: string): string[] {
	const parts: string[] = [];
	let current = "";
	let quote = "";
	for (const char of inner) {
		if (quote.length > 0) {
			quote = char === quote ? "" : quote;
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === ",") {
			parts.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	parts.push(current);
	return parts;
}

/** Trimmed value with surrounding double (JSON) or single (YAML) quotes removed. */
export function unquote(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
		try {
			return JSON.parse(trimmed) as string;
		} catch {
			return trimmed.slice(1, -1);
		}
	}
	if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
		return trimmed.slice(1, -1).replace(/''/g, "'");
	}
	return trimmed;
}
