import { KNOWLEDGE_STATES, memoryNote, memoryNoteName, parseMemory, type ChapterMemory, type Fact, type Knowledge } from "./memory.ts";
import { frontmatterEnd } from "./frontmatter.ts";
import { parsePlace } from "./places.ts";

/** One AI-proposed memory update. Nothing is written until the writer approves its `id`. */
export type Candidate =
	| { id: string; tipo: "hecho"; hecho: Fact }
	| { id: string; tipo: "conocimiento"; conocimiento: Knowledge }
	| { id: string; tipo: "estado"; lugar: string; descripcion: string };

export interface ExtractInput {
	capitulo: number;
	/** Chapter text just written. */
	texto: string;
	/** Memory notes already recorded, so known facts are reused by id. */
	memorias?: ChapterMemory[];
}

/** Prompt in, model reply out. The caller picks the provider (and checks its host). */
export type Complete = (prompt: string) => Promise<string>;

export interface ExtractFiles {
	exists(path: string): Promise<boolean>;
	createFolder(path: string): Promise<void>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
}

export interface ExtractTarget {
	capitulo: number;
	/** Path of `_Memoria/Cap NN.md`. */
	memoria: string;
	/** Path of a place sheet by name. */
	lugar(nombre: string): string;
}

export function extractionPrompt(input: ExtractInput): string {
	const known = (input.memorias ?? []).flatMap((memory) => memory.hechos.map((fact) => `- ${fact.id}: ${fact.texto}`));
	return [
		`Extrae del capítulo ${input.capitulo} lo que deba registrarse en la memoria de la novela.`,
		"Responde solo con JSON:",
		'{"hechos":[{"id":"","texto":"","verdad":true}],"conocimiento":[{"hecho":"<id>","quien":"lector o [[Personaje]]","estado":"ignora|sospecha|cree-falso|sabe"}],"estados":[{"lugar":"","descripcion":""}]}',
		"Reutiliza el id de un hecho ya registrado. No inventes nada que el texto no diga.",
		"",
		"Hechos ya registrados:",
		known.length > 0 ? known.join("\n") : "(ninguno)",
		"",
		"Capítulo:",
		input.texto.trim(),
	].join("\n");
}

/** Candidates from a model reply; malformed items are dropped, a reply without JSON gives none. */
export function parseProposal(reply: string): Candidate[] {
	const start = reply.indexOf("{");
	const end = reply.lastIndexOf("}");
	if (start === -1 || end <= start) {
		return [];
	}
	let data: unknown;
	try {
		data = JSON.parse(reply.slice(start, end + 1));
	} catch {
		return [];
	}
	const candidates: Candidate[] = [];
	const hechos = items(data, "hechos").filter((item) => text(item.id) && text(item.texto));
	hechos.forEach((item, i) => {
		const verdad = typeof item.verdad === "boolean" ? item.verdad : null;
		candidates.push({ id: `h${i + 1}`, tipo: "hecho", hecho: { id: text(item.id), texto: text(item.texto), verdad } });
	});
	const conocimiento = items(data, "conocimiento").filter(
		(item) => text(item.hecho) && text(item.quien) && (KNOWLEDGE_STATES as readonly string[]).includes(text(item.estado)),
	);
	conocimiento.forEach((item, i) => {
		candidates.push({
			id: `c${i + 1}`,
			tipo: "conocimiento",
			conocimiento: { hecho: text(item.hecho), quien: text(item.quien), estado: text(item.estado) },
		});
	});
	const estados = items(data, "estados").filter((item) => text(item.lugar) && text(item.descripcion));
	estados.forEach((item, i) => {
		candidates.push({ id: `e${i + 1}`, tipo: "estado", lugar: text(item.lugar), descripcion: text(item.descripcion) });
	});
	return candidates;
}

export async function proposeMemoryUpdates(input: ExtractInput, complete: Complete): Promise<Candidate[]> {
	return parseProposal(await complete(extractionPrompt(input)));
}

export function candidateLabel(candidate: Candidate): string {
	switch (candidate.tipo) {
		case "hecho": {
			const { id, texto, verdad } = candidate.hecho;
			const truth = verdad === null ? "" : verdad ? " (verdadero)" : " (falso)";
			return `Hecho ${id}: ${texto}${truth}`;
		}
		case "conocimiento": {
			const { quien, estado, hecho } = candidate.conocimiento;
			return `${quien} · ${estado} · ${hecho}`;
		}
		case "estado":
			return `${candidate.lugar}: ${candidate.descripcion}`;
	}
}

/**
 * Writes only the approved candidates and returns the paths written. Nothing approved → no
 * read-modify-write, no folder, no file. Facts whose id is already in the note stay as written by
 * hand; states for a place with no sheet are skipped (sheets are never created here).
 */
export async function writeApproved(
	files: ExtractFiles,
	target: ExtractTarget,
	candidates: Candidate[],
	approved: ReadonlySet<string>,
): Promise<string[]> {
	const chosen = candidates.filter((candidate) => approved.has(candidate.id));
	const written: string[] = [];

	const memoryNow = (await files.exists(target.memoria)) ? await files.read(target.memoria) : null;
	const memory = parseMemory(memoryNow ?? "");
	const ids = new Set(memory.hechos.map((fact) => fact.id));
	const hechos = chosen.flatMap((c) => {
		if (c.tipo !== "hecho" || ids.has(c.hecho.id)) {
			return [];
		}
		ids.add(c.hecho.id);
		return [c.hecho];
	});
	const known = new Set(memory.conocimiento.map(knowledgeKey));
	const conocimiento = chosen.flatMap((c) => {
		if (c.tipo !== "conocimiento" || known.has(knowledgeKey(c.conocimiento))) {
			return [];
		}
		known.add(knowledgeKey(c.conocimiento));
		return [c.conocimiento];
	});
	if (hechos.length > 0 || conocimiento.length > 0) {
		const note = memoryNow ?? memoryNote(target.capitulo);
		let updated = appendToList(note, "hechos", hechos.map(factLines));
		updated = appendToList(updated, "conocimiento", conocimiento.map(knowledgeLines));
		if (memoryNow === null) {
			const folder = target.memoria.slice(0, Math.max(0, target.memoria.lastIndexOf("/")));
			if (folder.length > 0 && !(await files.exists(folder))) {
				await files.createFolder(folder);
			}
		}
		await files.write(target.memoria, updated);
		written.push(target.memoria);
	}

	const chapter = `[[${memoryNoteName(target.capitulo)}]]`;
	for (const candidate of chosen) {
		if (candidate.tipo !== "estado") {
			continue;
		}
		const path = target.lugar(candidate.lugar);
		if (!(await files.exists(path))) {
			continue;
		}
		const note = await files.read(path);
		const recorded = parsePlace(note).estados.some(
			(state) => state.capitulo === chapter && state.descripcion === candidate.descripcion,
		);
		if (recorded) {
			continue;
		}
		const entry = [`capitulo: ${JSON.stringify(chapter)}`, `descripcion: ${JSON.stringify(candidate.descripcion)}`];
		await files.write(path, appendToList(note, "estados", [entry]));
		if (!written.includes(path)) {
			written.push(path);
		}
	}
	return written;
}

function factLines(fact: Fact): string[] {
	return [
		`id: ${fact.id}`,
		`texto: ${JSON.stringify(fact.texto)}`,
		...(fact.verdad === null ? [] : [`verdad: ${fact.verdad}`]),
	];
}

function knowledgeLines(entry: Knowledge): string[] {
	return [`hecho: ${entry.hecho}`, `quien: ${JSON.stringify(entry.quien)}`, `estado: ${entry.estado}`];
}

function knowledgeKey(entry: Knowledge): string {
	return `${entry.hecho}|${entry.quien}|${entry.estado}`;
}

/**
 * Appends `entries` to the end of the frontmatter list `key`. Every existing line stays byte for
 * byte (hand-written fields and comments included); an inline `key: []` becomes a block. A note
 * without real frontmatter (`frontmatterEnd`: a `---` scene break is not one) gets a new one in front.
 */
function appendToList(note: string, key: string, entries: string[][]): string {
	if (entries.length === 0) {
		return note;
	}
	const eol = note.includes("\r\n") ? "\r\n" : "\n";
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	const close = frontmatterEnd(lines);
	if (close === -1) {
		return appendToList(`---${eol}---${eol}${note}`, key, entries);
	}
	const at = lines.slice(1, close).findIndex((line) => line === `${key}:` || line.startsWith(`${key}: `)) + 1;
	let insertAt = close;
	let indent: string | null = null;
	if (at > 0) {
		insertAt = at + 1;
		for (let i = at + 1; i < close; i++) {
			const line = lines[i] ?? "";
			if (line.trim().length > 0 && !/^[\s-]/.test(line)) {
				break;
			}
			const item = /^(\s*)- /.exec(line);
			if (item && indent === null) {
				indent = item[1] ?? "";
			}
			if (line.trim().length > 0) {
				insertAt = i + 1;
			}
		}
		// An inline value (`key: []`) cannot take block items after it.
		lines[at] = `${key}:`;
	}
	const pad = indent ?? "  ";
	const block = entries.flatMap(([first, ...rest]) => [`${pad}- ${first}`, ...rest.map((line) => `${pad}  ${line}`)]);
	lines.splice(insertAt, 0, ...(at > 0 ? [] : [`${key}:`]), ...block);
	return lines.join(eol);
}

function items(data: unknown, key: string): Record<string, unknown>[] {
	const value = data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined;
	return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
}

function text(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}
