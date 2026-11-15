import { isSeq, parseDocument } from "yaml";

import { frontmatterBody, mapList, scalar } from "./frontmatter.ts";
import { FAILSAFE, yamlMaps } from "./memory-frontmatter.ts";
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
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		padre: scalar(frontmatter, "padre"),
		estados: parseStates(frontmatter),
	};
}

function parseStates(frontmatter: string): PlaceState[] {
	const lines = frontmatter.split("\n");
	const span = statesSpan(lines, 0, lines.length);
	const items = span?.flow ? (span.items ?? []) : mapList(frontmatter, "estados");
	return items.map((item) => ({
		capitulo: item.capitulo ?? "",
		descripcion: item.descripcion ?? "",
	}));
}

/**
 * Adds `states` to the `estados` list of a place sheet, written the way `parsePlace` reads it.
 * A block list gets the new items after its last line, at its own indent; a flow list
 * (`estados: [{...}]`) of maps becomes a block list with its items kept; an empty value, a
 * `# comment` or a missing key becomes a block list. Values are written in double quotes, as
 * `unquote` reads them back. Every other line stays byte for byte, so frontmatter that is not strict
 * YAML (`nombre: Torre: alta`) is kept as written. A value that is not a list, or a flow list with
 * an item that is not a map, throws.
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
	const span = statesSpan(lines, 1, close);
	const added = states.map((state) => ({ capitulo: state.capitulo, descripcion: state.descripcion }));
	if (span === null) {
		lines.splice(close, 0, "estados:", ...listLines(added, "  "));
	} else if (span.flow) {
		if (span.items === null) {
			throw new Error("«estados» de la ficha no se puede leer: corrígelo a mano antes de aprobar.");
		}
		lines.splice(span.at, span.to - span.at, "estados:", ...listLines([...span.items, ...added], "  "));
	} else if (/^(|~|null|Null|NULL)$/.test(span.inline)) {
		const indent = lines.slice(span.at + 1, span.to).map((line) => /^(\s*)- /.exec(line)?.[1]).find((pad) => pad !== undefined);
		lines.splice(span.to, 0, ...listLines(added, indent ?? "  "));
		lines[span.at] = "estados:";
	} else {
		throw new Error("«estados» no es una lista en la ficha: corrígelo a mano antes de aprobar.");
	}
	return lines.join(eol);
}

/**
 * Line that closes the frontmatter, found the way `frontmatterBody` (and so `parsePlace`) finds it:
 * the note opens with `---` and the first later line that starts with `---` closes it. A line such
 * as `]` that ends a multi-line flow list is just part of the block. -1 when there is none.
 */
function placeFrontmatterEnd(lines: readonly string[]): number {
	if (lines[0] !== "---" || lines.length < 2) {
		return -1;
	}
	return lines.findIndex((line, at) => at > 0 && line.startsWith("---"));
}

interface StatesSpan {
	/** Line of `estados:`. */
	at: number;
	/** Line after the value's last non-blank line. */
	to: number;
	/** Value written on the `estados:` line itself. */
	inline: string;
	/** True for a flow list (`[...]`, one line or several). */
	flow: boolean;
	/** Items of a flow list; null when it is not readable YAML. */
	items: Record<string, string>[] | null;
}

/** Where the `estados` value sits in `lines` between `from` and `end`; null when there is no key. */
function statesSpan(lines: readonly string[], from: number, end: number): StatesSpan | null {
	const at = lines.findIndex((line, i) => i >= from && i < end && /^estados:(\s|$)/.test(line));
	if (at === -1) {
		return null;
	}
	const value = (lines[at] ?? "").slice("estados:".length).trim();
	const inline = value.startsWith("#") ? "" : value;
	if (inline.startsWith("[")) {
		for (let to = at + 1; to <= end; to++) {
			const doc = parseDocument([inline, ...lines.slice(at + 1, to)].join("\n"), FAILSAFE);
			if (doc.errors.length === 0 && isSeq(doc.contents)) {
				const js: unknown[] = doc.toJS();
				const maps = yamlMaps(js);
				return { at, to, inline, flow: true, items: maps.length === js.length ? maps : null };
			}
		}
		return { at, to: at + 1, inline, flow: true, items: null };
	}
	let to = at + 1;
	for (let i = at + 1; i < end; i++) {
		const line = lines[i] ?? "";
		if (line.trim().length > 0 && !/^[\s-]/.test(line)) {
			break;
		}
		if (line.trim().length > 0) {
			to = i + 1;
		}
	}
	return { at, to, inline, flow: false, items: null };
}

/** Block list lines for `items`, each value in double quotes, each line prefixed with `indent`. */
function listLines(items: Record<string, string>[], indent: string): string[] {
	return items.flatMap((item) => {
		const fields = Object.entries(item);
		return fields.length === 0 ? [`${indent}- {}`] : fields.map(([field, value], i) => `${indent}${i === 0 ? "- " : "  "}${field}: ${JSON.stringify(value)}`);
	});
}
