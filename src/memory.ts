export const KNOWLEDGE_STATES = ["ignora", "sospecha", "cree-falso", "sabe"] as const;

export type KnowledgeState = (typeof KNOWLEDGE_STATES)[number];

export interface Fact {
	id: string;
	texto: string;
	verdad: boolean | null;
}

export interface Knowledge {
	hecho: string;
	quien: string;
	estado: string;
}

export interface ChapterMemory {
	capitulo: number;
	hechos: Fact[];
	conocimiento: Knowledge[];
}

export interface KnownFact {
	hecho: string;
	texto: string;
	verdad: boolean | null;
	estado: KnowledgeState;
}

export const READER = "lector";

export function memoryNoteName(chapter: number): string {
	return `Cap ${String(chapter).padStart(2, "0")}`;
}

export function chapterNumber(path: string): number | null {
	const base = path.slice(path.lastIndexOf("/") + 1);
	const match = /cap\.?\s*(\d+)/i.exec(base);
	return match ? Number(match[1]) : null;
}

export function memoryFolder(activePath: string): string {
	const marker = "/_Memoria/";
	const at = activePath.indexOf(marker);
	if (at !== -1) {
		return activePath.slice(0, at + marker.length - 1);
	}
	if (activePath === "_Memoria" || activePath.startsWith("_Memoria/")) {
		return "_Memoria";
	}
	const parent = parentOf(activePath);
	if (parent === "Manuscrito" || parent.endsWith("/Manuscrito")) {
		const project = parentOf(parent);
		return project.length > 0 ? `${project}/_Memoria` : "_Memoria";
	}
	return parent.length > 0 ? `${parent}/_Memoria` : "_Memoria";
}

export function memoryNote(chapter: number): string {
	return [
		"---",
		"tipo: memoria",
		`capitulo: ${chapter}`,
		"hechos: []",
		"conocimiento: []",
		"---",
		"",
		"<!-- hechos: id, texto, verdad (true/false) -->",
		"<!-- conocimiento: hecho (id), quien (lector o [[Personaje]]), estado (ignora | sospecha | cree-falso | sabe) -->",
		"",
	].join("\n");
}

export function parseMemory(note: string): ChapterMemory {
	const frontmatter = frontmatterBody(note);
	const chapter = Number(scalar(frontmatter, "capitulo"));
	return {
		capitulo: Number.isFinite(chapter) ? chapter : 0,
		hechos: listItems(frontmatter, "hechos").map((item) => ({
			id: item.id ?? "",
			texto: item.texto ?? "",
			verdad: truth(item.verdad ?? ""),
		})),
		conocimiento: listItems(frontmatter, "conocimiento").map((item) => ({
			hecho: item.hecho ?? "",
			quien: item.quien ?? "",
			estado: item.estado ?? "",
		})),
	};
}

export function knowledgeErrors(memory: ChapterMemory): string[] {
	return memory.conocimiento
		.filter((entry) => !isState(entry.estado))
		.map(
			(entry) =>
				`Estado «${entry.estado}» no válido para ${entry.hecho || "un hecho"}: usa ignora, sospecha, cree-falso o sabe.`,
		);
}

export function whatKnows(memories: ChapterMemory[], who: string, chapter: number): KnownFact[] {
	const holder = holderKey(who);
	const upTo = memories
		.filter((memory) => memory.capitulo <= chapter)
		.sort((a, b) => a.capitulo - b.capitulo);
	const facts = new Map<string, Fact>();
	const states = new Map<string, KnowledgeState>();
	for (const memory of upTo) {
		for (const fact of memory.hechos) {
			facts.set(fact.id, fact);
		}
		for (const entry of memory.conocimiento) {
			if (holderKey(entry.quien) === holder && isState(entry.estado)) {
				states.set(entry.hecho, entry.estado);
			}
		}
	}
	const known: KnownFact[] = [];
	for (const fact of facts.values()) {
		const estado = states.get(fact.id);
		if (estado) {
			known.push({ hecho: fact.id, texto: fact.texto, verdad: fact.verdad, estado });
		}
	}
	return known;
}

function isState(value: string): value is KnowledgeState {
	return (KNOWLEDGE_STATES as readonly string[]).includes(value);
}

function holderKey(who: string): string {
	const inner = who.trim().replace(/^\[\[/, "").replace(/\]\]$/, "");
	return (inner.split("|")[0] ?? "").trim().toLowerCase();
}

function truth(value: string): boolean | null {
	const lower = value.toLowerCase();
	if (lower === "true" || lower === "sí" || lower === "si") {
		return true;
	}
	if (lower === "false" || lower === "no") {
		return false;
	}
	return null;
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
	return match ? unquote(match[1] ?? "") : "";
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

function listItems(frontmatter: string, key: string): Record<string, string>[] {
	const lines = frontmatter.split("\n");
	const start = lines.findIndex((line) => line === `${key}:`);
	if (start === -1) {
		return [];
	}
	const items: Record<string, string>[] = [];
	let current: Record<string, string> | null = null;
	for (const line of lines.slice(start + 1)) {
		if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("-")) {
			break;
		}
		const item = /^ {2}- (\w+):\s*(.*)$/.exec(line);
		if (item) {
			current = { [item[1] ?? ""]: unquote(item[2] ?? "") };
			items.push(current);
			continue;
		}
		const field = /^ {4}(\w+):\s*(.*)$/.exec(line);
		if (field && current) {
			current[field[1] ?? ""] = unquote(field[2] ?? "");
		}
	}
	return items;
}
