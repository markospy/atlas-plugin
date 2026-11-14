export type EntityKind = "personaje" | "lugar" | "objeto";

export interface EntityEntry {
	tipo: EntityKind;
	nombre: string;
	alias: string[];
	path: string;
	escenas: string[];
}

export interface VaultNote {
	path: string;
	text: string;
}

const FOLDERS: [EntityKind, string][] = [
	["personaje", "Personajes"],
	["lugar", "Lugares"],
	["objeto", "Objetos"],
];

/** Entity sheets of one project, each with the scenes that name it or one of its aliases. */
export function buildEntityIndex(project: string, notes: VaultNote[]): EntityEntry[] {
	const prefix = project.length > 0 ? `${project}/` : "";
	const scenes = notes
		.filter((note) => note.path.startsWith(`${prefix}Manuscrito/`))
		.sort((a, b) => byPath(a.path, b.path));
	const index: EntityEntry[] = [];
	for (const [tipo, folder] of FOLDERS) {
		const sheets = notes
			.filter((note) => note.path.startsWith(`${prefix}${folder}/`))
			.sort((a, b) => byPath(a.path, b.path));
		for (const sheet of sheets) {
			const frontmatter = frontmatterBody(sheet.text);
			const alias = inlineList(frontmatter, "alias");
			const nombre = scalar(frontmatter, "nombre") || noteTitle(sheet.path);
			const terms = [nombre, ...alias];
			index.push({
				tipo,
				nombre,
				alias,
				path: sheet.path,
				escenas: scenes.filter((scene) => mentions(scene.text, terms)).map((scene) => scene.path),
			});
		}
	}
	return index;
}

const PROJECT_FOLDERS = ["Manuscrito", "Personajes", "Lugares", "Objetos"];

/** Project folder of the active note: the parent of its Manuscrito/ or sheet folder, else its own folder. */
export function projectOf(activePath: string): string {
	const parts = activePath.split("/");
	for (let at = parts.length - 2; at >= 0; at--) {
		if (PROJECT_FOLDERS.includes(parts[at] ?? "")) {
			return parts.slice(0, at).join("/");
		}
	}
	return parts.slice(0, -1).join("/");
}

/** True when `text` contains any term as a whole word, ignoring case. */
export function mentions(text: string, terms: string[]): boolean {
	return terms.some((term) => {
		const clean = term.trim();
		if (clean.length === 0) {
			return false;
		}
		const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
	});
}

function byPath(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true });
}

function noteTitle(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/i, "");
}

function frontmatterBody(note: string): string {
	if (!note.startsWith("---\n")) {
		return "";
	}
	const end = note.indexOf("\n---", 3);
	return end === -1 ? "" : note.slice(4, end);
}

function scalar(frontmatter: string, key: string): string {
	const match = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(frontmatter);
	return match ? unquote(match[1] ?? "") : "";
}

function inlineList(frontmatter: string, key: string): string[] {
	const match = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m").exec(frontmatter);
	const inner = match?.[1] ?? "";
	return inner.trim().length === 0 ? [] : inner.split(",").map((item) => unquote(item));
}

function unquote(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		try {
			return JSON.parse(trimmed) as string;
		} catch {
			return trimmed.slice(1, -1);
		}
	}
	return trimmed;
}
