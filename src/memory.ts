import { frontmatterBody, mapList, scalar } from "./frontmatter.ts";
import { sheetFolder } from "./sheets.ts";

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

export interface FactUse {
	hecho: string;
	quien: string;
	modo: string;
}

export interface ChapterMemory {
	capitulo: number;
	hechos: Fact[];
	conocimiento: Knowledge[];
	usos: FactUse[];
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
	const match = /^cap\.?\s*(\d+)/i.exec(base);
	return match ? Number(match[1]) : null;
}

export function memoryFolder(activePath: string): string {
	return sheetFolder(activePath, "_Memoria");
}

const PROJECT_FOLDERS = ["_Memoria", "Manuscrito", "Personajes", "Lugares", "Objetos", "Trama"];

/** The project's `_Memoria/` for any note in it: `Novela/Personajes/Elena.md` → `Novela/_Memoria`. */
export function projectMemoryFolder(activePath: string): string {
	const parts = activePath.split("/");
	let project = parts.slice(0, -1);
	for (let at = parts.length - 2; at >= 0; at--) {
		if (PROJECT_FOLDERS.includes(parts[at] ?? "")) {
			project = parts.slice(0, at);
			break;
		}
	}
	return [...project, "_Memoria"].join("/");
}

export function memoryNote(chapter: number): string {
	return [
		"---",
		"tipo: memoria",
		`capitulo: ${chapter}`,
		"hechos: []",
		"conocimiento: []",
		"usos: []",
		"---",
		"",
		"<!-- hechos: id, texto, verdad (true/false) -->",
		"<!-- conocimiento: hecho (id), quien (lector o [[Personaje]]), estado (ignora | sospecha | cree-falso | sabe) -->",
		"<!-- usos: hecho (id), quien ([[Personaje]]), modo (menciona | actua) -->",
		"",
	].join("\n");
}

export function parseMemory(note: string): ChapterMemory {
	const frontmatter = frontmatterBody(note);
	const chapter = Number(scalar(frontmatter, "capitulo"));
	return {
		capitulo: Number.isFinite(chapter) ? chapter : 0,
		hechos: mapList(frontmatter, "hechos").map((item) => ({
			id: item.id ?? "",
			texto: item.texto ?? "",
			verdad: truth(item.verdad ?? ""),
		})),
		conocimiento: mapList(frontmatter, "conocimiento").map((item) => ({
			hecho: item.hecho ?? "",
			quien: item.quien ?? "",
			estado: item.estado ?? "",
		})),
		usos: mapList(frontmatter, "usos").map((item) => ({
			hecho: item.hecho ?? "",
			quien: item.quien ?? "",
			modo: item.modo ?? "",
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

export function holderKey(who: string): string {
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
