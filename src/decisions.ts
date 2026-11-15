import { mentions, type VaultNote } from "./entities.ts";
import { chapterOf } from "./peek.ts";

/** A canon change decided going forward: from chapter `desde` on, `antiguo` is called `nuevo`. */
export interface Decision {
	id: string;
	antiguo: string;
	nuevo: string;
	desde: number;
	/** Earlier chapters the writer marked as already aligned with the decision. */
	alineados: number[];
}

/** Decisions per project folder. */
export interface DecisionStore {
	decisiones: Record<string, Decision[]>;
}

/** An earlier chapter that still names the old value, with the scenes that do. */
export interface PendingChapter {
	capitulo: number;
	escenas: string[];
}

/** Appends a validated decision with the next free id (`d1`, `d2`…). Nothing in the manuscript is rewritten. */
export function addDecision(
	current: Decision[],
	input: { antiguo: string; nuevo: string; desde: number },
): Decision[] {
	const antiguo = input.antiguo.trim();
	const nuevo = input.nuevo.trim();
	if (antiguo.length === 0) {
		throw new Error("Falta el valor antiguo.");
	}
	if (nuevo.length === 0) {
		throw new Error("Falta el valor nuevo.");
	}
	if (antiguo === nuevo) {
		throw new Error("El valor nuevo debe ser distinto del antiguo.");
	}
	if (!Number.isInteger(input.desde) || input.desde < 1) {
		throw new Error("El capítulo de corte debe ser un número entero mayor que 0.");
	}
	const used = new Set(current.map((decision) => decision.id));
	let next = current.length + 1;
	while (used.has(`d${next}`)) {
		next++;
	}
	return [...current, { id: `d${next}`, antiguo, nuevo, desde: input.desde, alineados: [] }];
}

/**
 * Chapters before the cut whose `Manuscrito/` scenes still name `antiguo` as a whole word (any case),
 * minus those the writer marked as aligned. Oldest first.
 */
export function pendingChapters(project: string, decision: Decision, notes: VaultNote[]): PendingChapter[] {
	const prefix = project.length > 0 ? `${project}/` : "";
	const found = new Map<number, string[]>();
	for (const note of notes) {
		if (!note.path.startsWith(`${prefix}Manuscrito/`)) {
			continue;
		}
		const chapter = chapterOf(note.path);
		if (chapter === null || chapter >= decision.desde || decision.alineados.includes(chapter)) {
			continue;
		}
		if (mentions(note.text, [decision.antiguo])) {
			found.set(chapter, [...(found.get(chapter) ?? []), note.path]);
		}
	}
	return [...found.entries()]
		.map(([capitulo, escenas]) => ({
			capitulo,
			escenas: escenas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
		}))
		.sort((a, b) => a.capitulo - b.capitulo);
}

/** The writer aligned `chapter` with the decision by hand: it leaves the pending list. */
export function markAligned(decision: Decision, chapter: number): Decision {
	if (decision.alineados.includes(chapter)) {
		return decision;
	}
	return { ...decision, alineados: [...decision.alineados, chapter].sort((a, b) => a - b) };
}

export function parseDecisions(text: string | null): DecisionStore {
	if (!text) {
		return { decisiones: {} };
	}
	const data = JSON.parse(text) as Partial<DecisionStore>;
	return { decisiones: data.decisiones ?? {} };
}
