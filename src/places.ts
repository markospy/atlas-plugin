import { Document, isMap, isNode, isScalar, isSeq, parseDocument } from "yaml";

import { frontmatterBody, scalar } from "./frontmatter.ts";
import { FAILSAFE, insertFlowItems, text, yamlMaps } from "./memory-frontmatter.ts";
import { sheetFolder } from "./sheets.ts";

export interface PlaceState {
	capitulo: string;
	descripcion: string;
}

export interface PlaceSheet {
	nombre: string;
	padre: string;
	estados: PlaceState[];
}

export function placeFolder(activePath: string): string {
	return sheetFolder(activePath, "Lugares");
}

export function placeNote(name: string): string {
	return [
		"---",
		"tipo: lugar",
		`nombre: ${JSON.stringify(name)}`,
		"padre:",
		"estados: []",
		"viajes: []",
		"---",
		"",
		"## Vista",
		"",
		"## Sonido",
		"",
		"## Olor",
		"",
		"## Tacto",
		"",
		"## Disposición",
		"",
		"## Atmósfera",
		"",
	].join("\n");
}

export function parsePlace(note: string): PlaceSheet {
	const lines = frontmatterBody(note).split("\n");
	const found = placeEntries(lines);
	const value = (key: string): unknown => {
		const entry = found.find((item) => item.key === key);
		return entry && entry.doc.errors.length === 0 ? entry.doc.toJS()?.[key] : undefined;
	};
	// An entry that is not strict YAML (`nombre: Torre: alta`) reads as written on its line.
	const field = (key: string): string => {
		const entry = found.find((item) => item.key === key);
		return entry && entry.doc.errors.length > 0 ? scalar(lines.slice(entry.from, entry.to).join("\n"), key) : text(value(key));
	};
	return {
		nombre: field("nombre"),
		padre: field("padre"),
		estados: yamlMaps(states(found.find((item) => item.key === "estados"))).map((item) => ({ capitulo: item.capitulo ?? "", descripcion: item.descripcion ?? "" })),
	};
}

/**
 * The `estados` list as YAML reads it. When one of its items is not strict YAML
 * (`descripcion: a: b`), the other items are still read and a warning says how many were left out.
 */
function states(entry: PlaceEntry | undefined): unknown {
	if (!entry || entry.doc.errors.length === 0) {
		return entry?.doc.toJS()?.estados;
	}
	const list = entry.doc.get("estados", true);
	const items = isSeq(list) ? list.items.filter(isNode) : [];
	const valid = items.filter((item) => !entry.doc.errors.some((error) => !!item.range && error.pos[0] < item.range[2] && error.pos[1] > item.range[0]));
	console.warn(`Atlas: ${Math.max(items.length - valid.length, 1)} entrada(s) de «estados» no son YAML válido y no se leen: corrígelas a mano.`);
	return valid.map((item) => item.toJS(entry.doc));
}

/**
 * Adds `states` to the `estados` list of a place sheet. The list is read with the `yaml` library,
 * as `parsePlace` reads it: block or flow, comments, `|-` and quotes included. The new items go
 * after the last line of a block list, at its indent, or right after the last item of a flow list; an
 * empty list becomes a block list. Every other character stays as written, so comments and an
 * entry that is not strict YAML (`nombre: Torre: alta`) are kept. New values are quoted when the
 * YAML core schema would read them as another type (`null`, `123`).
 * A missing or empty `estados` becomes a list. A value that is not a list of maps throws.
 */
export function addPlaceStates(note: string, states: PlaceState[]): string {
	if (states.length === 0) {
		return note;
	}
	const eol = note.includes("\r\n") ? "\r\n" : "\n";
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	const close = placeFrontmatterEnd(lines);
	if (close === -1) {
		return addPlaceStates(`---${eol}---${eol}${note}`, states);
	}
	const frontmatter = lines.slice(1, close);
	const entry = placeEntries(frontmatter).find((item) => item.key === "estados");
	if (entry && entry.doc.errors.length > 0) {
		throw new Error("«estados» de la ficha no se puede leer: corrígelo a mano antes de aprobar.");
	}
	const doc = entry?.doc ?? new Document({}, FAILSAFE);
	let current: unknown = doc.toJS()?.estados;
	if (current === null || current === undefined || (typeof current === "string" && /^(|~|null|Null|NULL)$/.test(current))) {
		current = [];
	}
	if (!Array.isArray(current)) {
		throw new Error("«estados» no es una lista en la ficha: corrígelo a mano antes de aprobar.");
	}
	if (!current.every((item) => !!item && typeof item === "object" && !Array.isArray(item))) {
		throw new Error("«estados» de la ficha no se puede leer: corrígelo a mano antes de aprobar.");
	}
	const added = states.map((state) => ({ capitulo: state.capitulo, descripcion: state.descripcion }));
	const list = doc.get("estados", true);
	const source = entry ? frontmatter.slice(entry.from, entry.to).join("\n") : "";
	let written: string[];
	if (entry && isSeq(list) && list.flow && list.items.length > 0 && list.range) {
		// Flow list: the new items go in flow form right after its last item, before any comment.
		const updated = insertFlowItems(source, list, added);
		if (updated === null) {
			throw new Error("«estados» de la ficha no se puede leer: corrígelo a mano antes de aprobar.");
		}
		written = updated.split("\n");
	} else if (entry && isSeq(list) && list.items.length > 0 && list.range) {
		// Block list: only the new items' lines are added after its last line, at the indent of its first `- `.
		const indent = " ".repeat(list.range[0] - (source.lastIndexOf("\n", list.range[0] - 1) + 1));
		const items = new Document(added).toString({ lineWidth: 0 }).replace(/\n$/, "").split("\n");
		written = [...source.split("\n"), ...items.map((line) => indent + line)];
	} else {
		// Empty or missing list, written with the core schema so its values read back as text.
		const empty = entry ? parseDocument(source) : new Document({});
		empty.set("estados", empty.createNode(added));
		written = empty.toString({ lineWidth: 0 }).replace(/\n$/, "").split("\n");
	}
	frontmatter.splice(entry?.from ?? frontmatter.length, entry ? entry.to - entry.from : 0, ...written);
	return [lines[0], ...frontmatter, ...lines.slice(close)].join(eol);
}

/**
 * Line that closes the frontmatter, found the way `frontmatterBody` (and so `parsePlace`) finds it:
 * the note opens with `---` and the first later line that starts with `---` closes it. -1 when
 * there is none.
 */
function placeFrontmatterEnd(lines: readonly string[]): number {
	if (lines[0] !== "---" || lines.length < 2) {
		return -1;
	}
	return lines.findIndex((line, at) => at > 0 && line.startsWith("---"));
}

interface PlaceEntry {
	key: string;
	/** First line of the entry in the frontmatter lines. */
	from: number;
	/** Line after its last line; blank and `# comment` lines that follow it are left out. */
	to: number;
	/** The entry alone, parsed with the `yaml` library (failsafe: every value as written). */
	doc: Document.Parsed;
}

/**
 * Top-level entries of a frontmatter, each parsed with the `yaml` library on its own, so one entry
 * that is not strict YAML does not stop the others being read or written. A top-level key starts
 * at column 0; a line that is indented, blank, a `# comment`, a `- ` item or a closing `]` / `}`
 * continues the entry above it.
 */
function placeEntries(lines: readonly string[]): PlaceEntry[] {
	const starts = lines.flatMap((line, at) => (/^[^\s#\-\]}]/.test(line) ? [at] : []));
	return starts.flatMap((from, i) => {
		let to = starts[i + 1] ?? lines.length;
		while (to > from + 1 && /^(\s*|#.*)$/.test(lines[to - 1] ?? "")) {
			to--;
		}
		const doc = parseDocument(lines.slice(from, to).join("\n"), FAILSAFE);
		const key = isMap(doc.contents) ? doc.contents.items[0]?.key : undefined;
		return isScalar(key) ? [{ key: String(key.value), from, to, doc }] : [];
	});
}
