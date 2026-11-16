import { KNOWLEDGE_STATES, memoryNote, memoryNoteName, parseMemory, type ChapterMemory, type Fact, type Knowledge } from "./memory.ts";
import { Document, isMap, isScalar, isSeq } from "yaml";

import { memoryFrontmatter } from "./memory-frontmatter.ts";
import { addPlaceStates, parsePlace } from "./places.ts";

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
 * hand; states for a place with no sheet are skipped (sheets are never created here). Every note is
 * prepared before any is written, and place sheets are written before `_Memoria/`: a sheet that
 * cannot take its state throws and leaves the memory note as it was.
 */
export async function writeApproved(
	files: ExtractFiles,
	target: ExtractTarget,
	candidates: Candidate[],
	approved: ReadonlySet<string>,
): Promise<string[]> {
	const chosen = candidates.filter((candidate) => approved.has(candidate.id));

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
	let memoryNext: string | null = null;
	if (hechos.length > 0 || conocimiento.length > 0) {
		const note = memoryNow ?? memoryNote(target.capitulo);
		memoryNext = appendToList(appendToList(note, "hechos", hechos.map(factEntry)), "conocimiento", conocimiento.map(knowledgeEntry));
	}

	const chapter = `[[${memoryNoteName(target.capitulo)}]]`;
	const places = new Map<string, string>();
	const originals = new Map<string, string>();
	for (const candidate of chosen) {
		if (candidate.tipo !== "estado") {
			continue;
		}
		const path = target.lugar(candidate.lugar);
		if (!originals.has(path) && (await files.exists(path))) {
			originals.set(path, await files.read(path));
		}
		const note = places.get(path) ?? originals.get(path) ?? null;
		if (note === null) {
			continue;
		}
		const recorded = parsePlace(note).estados.some(
			(state) => state.capitulo === chapter && state.descripcion === candidate.descripcion,
		);
		if (!recorded) {
			places.set(path, addPlaceStates(note, [{ capitulo: chapter, descripcion: candidate.descripcion }]));
		}
	}

	// All or nothing: if one place sheet cannot be written, the ones already written get their text back.
	const written: string[] = [];
	try {
		for (const [path, note] of places) {
			await files.write(path, note);
			written.push(path);
		}
	} catch (error) {
		for (const path of written) {
			await files.write(path, originals.get(path) ?? "").catch(() => {});
		}
		throw error;
	}
	if (memoryNext !== null) {
		if (memoryNow === null) {
			const folder = target.memoria.slice(0, Math.max(0, target.memoria.lastIndexOf("/")));
			if (folder.length > 0 && !(await files.exists(folder))) {
				await files.createFolder(folder);
			}
		}
		await files.write(target.memoria, memoryNext);
	}
	return [...(memoryNext === null ? [] : [target.memoria]), ...places.keys()];
}

function factEntry(fact: Fact): Record<string, unknown> {
	return { id: fact.id, texto: fact.texto, ...(fact.verdad === null ? {} : { verdad: fact.verdad }) };
}

function knowledgeEntry(entry: Knowledge): Record<string, unknown> {
	return { hecho: entry.hecho, quien: entry.quien, estado: entry.estado };
}

function knowledgeKey(entry: Knowledge): string {
	return `${entry.hecho}|${entry.quien}|${entry.estado}`;
}

/**
 * Appends `entries` to the frontmatter list `key`. The frontmatter is read with the `yaml`
 * library, but only that list changes: a block list gets the new items after its last line, at
 * its own indent; a flow list (one line or several) gets them before its closing `]`; an empty
 * value or a missing key becomes a block list. Every other line, and the body after the closing
 * `---`, stays byte for byte. A value that is not a list, or frontmatter that is not valid YAML,
 * throws rather than lose what the author wrote. A note without frontmatter (a `---` scene break
 * is not one) gets a new one in front.
 */
function appendToList(note: string, key: string, entries: Record<string, unknown>[]): string {
	if (entries.length === 0) {
		return note;
	}
	const eol = note.includes("\r\n") ? "\r\n" : "\n";
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	const { end, doc, invalid } = memoryFrontmatter(lines);
	if (invalid) {
		throw new Error("El frontmatter de la nota no es YAML válido: corrígelo a mano antes de aprobar.");
	}
	if (end === -1 || doc === null) {
		return appendToList(`---${eol}---${eol}${note}`, key, entries);
	}
	const source = lines.slice(1, end).join("\n");
	const pair = isMap(doc.contents) ? doc.contents.items.find((item) => isScalar(item.key) && item.key.value === key) : undefined;
	const value = pair?.value;
	const empty =
		value === null ||
		value === undefined ||
		(isSeq(value) && value.items.length === 0) ||
		(isScalar(value) && (value.value === null || (value.type === "PLAIN" && /^(|~|null|Null|NULL)$/.test(String(value.value)))));
	if (!empty && !isSeq(value)) {
		throw new Error(`«${key}» no es una lista en la nota: corrígelo a mano antes de aprobar.`);
	}
	const frontmatter = source.length === 0 ? [] : source.split("\n");
	if (isSeq(value) && value.flow && value.range && value.items.length > 0) {
		// Flow list: the new items go in flow form before its closing `]`.
		let at = value.range[1] - 1;
		while (at > 0 && /\s/.test(source[at - 1] ?? "")) {
			at--;
		}
		const lead = source[at - 1] === "," ? " " : ", ";
		const flow = entries.map((entry) => {
			const item = new Document(entry);
			if (isMap(item.contents)) {
				item.contents.flow = true;
			}
			return item.toString({ lineWidth: 0 }).trim();
		});
		const updated = `${source.slice(0, at)}${lead}${flow.join(", ")}${source.slice(at)}`;
		return ["---", ...updated.split("\n"), ...lines.slice(end)].join(eol);
	}
	const added = blockLines(new Document(entries).toString({ lineWidth: 0 }));
	if (isSeq(value) && !value.flow && value.range) {
		// Block list: the new items go after its last line, at its own indent.
		const last = lineOf(source, value.range[1]);
		const indent = " ".repeat(value.range[0] - source.lastIndexOf("\n", value.range[0] - 1) - 1);
		frontmatter.splice(last + 1, 0, ...added.map((line) => indent + line));
	} else if (pair && isScalar(pair.key) && pair.key.range) {
		// Empty value (`key:`, `key: []`, `key: ~`): its lines become a block list.
		const from = lineOf(source, pair.key.range[0] + 1);
		const to = lineOf(source, Math.max(pair.key.range[1], value && "range" in value && value.range ? value.range[1] : 0)) + 1;
		frontmatter.splice(from, to - from, `${key}:`, ...added.map((line) => `  ${line}`));
	} else {
		frontmatter.push(`${key}:`, ...added.map((line) => `  ${line}`));
	}
	return ["---", ...frontmatter, ...lines.slice(end)].join(eol);
}

/** Lines of a YAML block as `yaml` prints it, without the trailing newline. */
function blockLines(yaml: string): string[] {
	return yaml.replace(/\n$/, "").split("\n");
}

/** Index of the line holding the last non-blank character before `offset` in `source`. */
function lineOf(source: string, offset: number): number {
	let at = offset;
	while (at > 0 && /\s/.test(source[at - 1] ?? "")) {
		at--;
	}
	return source.slice(0, Math.max(at - 1, 0)).split("\n").length - 1;
}

function items(data: unknown, key: string): Record<string, unknown>[] {
	const value = data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined;
	return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
}

function text(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}
