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

function sheetFolder(activePath: string, folderName: string): string {
	const marker = `/${folderName}/`;
	const at = activePath.indexOf(marker);
	if (at !== -1) {
		return activePath.slice(0, at + marker.length - 1);
	}
	if (activePath === folderName || activePath.startsWith(`${folderName}/`)) {
		return folderName;
	}
	const parent = parentOf(activePath);
	if (parent === "Manuscrito" || parent.endsWith("/Manuscrito")) {
		const project = parentOf(parent);
		return project.length > 0 ? `${project}/${folderName}` : folderName;
	}
	return parent.length > 0 ? `${parent}/${folderName}` : folderName;
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

function parseStates(frontmatter: string): PlaceState[] {
	const lines = frontmatter.split("\n");
	const start = lines.findIndex((line) => line === "estados:");
	if (start === -1) {
		return [];
	}
	const states: PlaceState[] = [];
	let current: PlaceState | null = null;
	for (const line of lines.slice(start + 1)) {
		if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("-")) {
			break;
		}
		const item = /^ {2}- (\w+):\s*(.*)$/.exec(line);
		if (item) {
			if (current) {
				states.push(current);
			}
			current = { capitulo: "", descripcion: "" };
			assignState(current, item[1] ?? "", unquote(item[2] ?? ""));
			continue;
		}
		const field = /^ {4}(\w+):\s*(.*)$/.exec(line);
		if (field && current) {
			assignState(current, field[1] ?? "", unquote(field[2] ?? ""));
		}
	}
	if (current) {
		states.push(current);
	}
	return states;
}

function assignState(state: PlaceState, key: string, value: string): void {
	if (key === "capitulo" || key === "descripcion") {
		state[key] = value;
	}
}
