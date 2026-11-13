export interface CharacterRelation {
	con: string;
	tipo: string;
	desde?: string;
	hasta?: string;
	nota?: string;
}

export interface CharacterSheet {
	nombre: string;
	alias: string[];
	relaciones: CharacterRelation[];
}

const WIKILINK = /^\[\[[^\]]+\]\]$/;

export function characterFolder(activePath: string): string {
	const marker = "/Personajes/";
	const at = activePath.indexOf(marker);
	if (at !== -1) {
		return activePath.slice(0, at + "/Personajes".length);
	}
	if (activePath === "Personajes" || activePath.startsWith("Personajes/")) {
		return "Personajes";
	}
	const parent = parentOf(activePath);
	if (parent === "Manuscrito" || parent.endsWith("/Manuscrito")) {
		const project = parentOf(parent);
		return project.length > 0 ? `${project}/Personajes` : "Personajes";
	}
	return parent.length > 0 ? `${parent}/Personajes` : "Personajes";
}

function parentOf(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
}

export function characterNote(name: string): string {
	return [
		"---",
		"tipo: personaje",
		`nombre: ${JSON.stringify(name)}`,
		"alias: []",
		"relaciones: []",
		"---",
		"",
		"## Físico",
		"",
		"## Psicología",
		"",
		"- Deseo:",
		"- Miedo:",
		"- Herida:",
		"- Contradicción:",
		"",
		"## Voz",
		"",
		"## Arco",
		"",
		"- Inicio:",
		"- Final:",
		"",
	].join("\n");
}

export function relationErrors(relations: CharacterRelation[]): string[] {
	return relations
		.filter((relation) => !WIKILINK.test(relation.con.trim()))
		.map((relation) => `La relación «${relation.tipo || "sin tipo"}» necesita un destino [[nota]].`);
}

export function parseCharacter(note: string): CharacterSheet {
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		alias: inlineList(frontmatter, "alias"),
		relaciones: parseRelations(frontmatter),
	};
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
	if (!match) {
		return "";
	}
	return unquote(match[1] ?? "");
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

function inlineList(frontmatter: string, key: string): string[] {
	const match = new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, "m").exec(frontmatter);
	if (!match) {
		return [];
	}
	const inner = match[1] ?? "";
	if (inner.trim().length === 0) {
		return [];
	}
	return inner.split(",").map((item) => unquote(item));
}

function parseRelations(frontmatter: string): CharacterRelation[] {
	const lines = frontmatter.split("\n");
	const start = lines.findIndex((line) => line === "relaciones:");
	if (start === -1) {
		return [];
	}
	const relations: CharacterRelation[] = [];
	let current: CharacterRelation | null = null;
	for (const line of lines.slice(start + 1)) {
		if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("-")) {
			break;
		}
		const item = /^ {2}- (\w+):\s*(.*)$/.exec(line);
		if (item) {
			if (current) {
				relations.push(current);
			}
			current = { con: "", tipo: "" };
			assignField(current, item[1] ?? "", unquote(item[2] ?? ""));
			continue;
		}
		const field = /^ {4}(\w+):\s*(.*)$/.exec(line);
		if (field && current) {
			assignField(current, field[1] ?? "", unquote(field[2] ?? ""));
		}
	}
	if (current) {
		relations.push(current);
	}
	return relations;
}

function assignField(relation: CharacterRelation, key: string, value: string): void {
	if (key === "con" || key === "tipo" || key === "desde" || key === "hasta" || key === "nota") {
		relation[key] = value;
	}
}
