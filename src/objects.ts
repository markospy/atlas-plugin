export interface ObjectPossession {
	poseedor: string;
	capitulo: string;
}

export interface ObjectSheet {
	nombre: string;
	valor_material: string;
	valor_sentimental: string;
	funcion: string;
	foreshadowing: string;
	posesiones: ObjectPossession[];
}

export function objectFolder(activePath: string): string {
	const marker = "/Objetos/";
	const at = activePath.indexOf(marker);
	if (at !== -1) {
		return activePath.slice(0, at + "/Objetos".length);
	}
	if (activePath === "Objetos" || activePath.startsWith("Objetos/")) {
		return "Objetos";
	}
	const parent = parentOf(activePath);
	if (parent === "Manuscrito" || parent.endsWith("/Manuscrito")) {
		const project = parentOf(parent);
		return project.length > 0 ? `${project}/Objetos` : "Objetos";
	}
	return parent.length > 0 ? `${parent}/Objetos` : "Objetos";
}

export function objectNote(name: string): string {
	return [
		"---",
		"tipo: objeto",
		`nombre: ${JSON.stringify(name)}`,
		"valor_material:",
		"valor_sentimental:",
		"funcion:",
		"foreshadowing:",
		"posesiones: []",
		"---",
		"",
		"## Descripción",
		"",
		"## Origen",
		"",
		"## Valor material",
		"",
		"## Valor sentimental",
		"",
		"Para quién y por qué.",
		"",
		"## Función en la trama",
		"",
	].join("\n");
}

export function parseObject(note: string): ObjectSheet {
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		valor_material: scalar(frontmatter, "valor_material"),
		valor_sentimental: scalar(frontmatter, "valor_sentimental"),
		funcion: scalar(frontmatter, "funcion"),
		foreshadowing: scalar(frontmatter, "foreshadowing"),
		posesiones: parsePossessions(frontmatter),
	};
}

/** Who holds the object in chapter `chapter`: the latest change at or before it, or "". */
export function holderAt(sheet: ObjectSheet, chapter: number): string {
	let holder = "";
	let since = -Infinity;
	for (const possession of sheet.posesiones) {
		const at = chapterNumber(possession.capitulo);
		if (at !== null && at <= chapter && at >= since) {
			holder = possession.poseedor;
			since = at;
		}
	}
	return holder;
}

function chapterNumber(chapter: string): number | null {
	const match = /\d+/.exec(chapter);
	return match ? Number(match[0]) : null;
}

function parentOf(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
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

function parsePossessions(frontmatter: string): ObjectPossession[] {
	const lines = frontmatter.split("\n");
	const start = lines.findIndex((line) => line === "posesiones:");
	if (start === -1) {
		return [];
	}
	const possessions: ObjectPossession[] = [];
	let current: ObjectPossession | null = null;
	for (const line of lines.slice(start + 1)) {
		if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("-")) {
			break;
		}
		const item = /^ {2}- (\w+):\s*(.*)$/.exec(line);
		if (item) {
			if (current) {
				possessions.push(current);
			}
			current = { poseedor: "", capitulo: "" };
			assignPossession(current, item[1] ?? "", unquote(item[2] ?? ""));
			continue;
		}
		const field = /^ {4}(\w+):\s*(.*)$/.exec(line);
		if (field && current) {
			assignPossession(current, field[1] ?? "", unquote(field[2] ?? ""));
		}
	}
	if (current) {
		possessions.push(current);
	}
	return possessions;
}

function assignPossession(possession: ObjectPossession, key: string, value: string): void {
	if (key === "poseedor" || key === "capitulo") {
		possession[key] = value;
	}
}
