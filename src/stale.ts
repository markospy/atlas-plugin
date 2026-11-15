import type { FactGraph } from "./dependencies.ts";
import type { Fact } from "./memory.ts";

export type FactChangeKind = "añadido" | "eliminado" | "cambiado";

export interface FactChange {
	hecho: string;
	cambio: FactChangeKind;
}

/** A chapter that may no longer hold up, with one readable reason per broken fact. */
export interface StaleChapter {
	capitulo: number;
	motivos: string[];
}

/** What propagation remembers between runs: last seen facts per memory note, stale list per `_Memoria/` folder. */
export interface PropagationStore {
	base: Record<string, Fact[]>;
	stale: Record<string, StaleChapter[]>;
}

/** Facts added, removed or changed (text or truth) between two versions of one chapter's `hechos`. */
export function factChanges(before: Fact[], after: Fact[]): FactChange[] {
	const old = new Map(before.filter((fact) => fact.id.length > 0).map((fact) => [fact.id, fact]));
	const now = new Map(after.filter((fact) => fact.id.length > 0).map((fact) => [fact.id, fact]));
	const changes: FactChange[] = [];
	for (const [id, fact] of old) {
		const next = now.get(id);
		if (!next) {
			changes.push({ hecho: id, cambio: "eliminado" });
		} else if (next.texto !== fact.texto || next.verdad !== fact.verdad) {
			changes.push({ hecho: id, cambio: "cambiado" });
		}
	}
	for (const id of now.keys()) {
		if (!old.has(id)) {
			changes.push({ hecho: id, cambio: "añadido" });
		}
	}
	return changes.sort((a, b) => a.hecho.localeCompare(b.hecho));
}

/**
 * Later chapters that used a removed or changed fact of `edited` and have nothing else to lean on.
 * `graph` is built from the memories as they are now, after the edit. Added facts break nobody.
 */
export function staleFrom(graph: FactGraph, edited: number, changes: FactChange[]): StaleChapter[] {
	const found = new Map<number, string[]>();
	for (const change of changes) {
		if (change.cambio === "añadido") {
			continue;
		}
		const introducers = graph.edges
			.filter((edge) => edge.tipo === "introduce" && edge.hecho === change.hecho)
			.map((edge) => edge.capitulo);
		const users = graph.edges.filter(
			(edge) => edge.tipo === "usa" && edge.hecho === change.hecho && edge.capitulo > edited,
		);
		for (const use of users) {
			const covered =
				change.cambio === "eliminado"
					? introducers.some((chapter) => chapter <= use.capitulo)
					: introducers.some((chapter) => chapter > edited && chapter <= use.capitulo);
			if (covered) {
				continue;
			}
			const motivo =
				change.cambio === "eliminado"
					? `El cap. ${use.capitulo} usa «${change.hecho}», que ya no se introduce en el cap. ${edited}.`
					: `El cap. ${use.capitulo} usa «${change.hecho}», que cambió en el cap. ${edited}.`;
			found.set(use.capitulo, [...(found.get(use.capitulo) ?? []), motivo]);
		}
	}
	return [...found.entries()].map(([capitulo, motivos]) => ({ capitulo, motivos })).sort(byChapter);
}

/** Adds new stale chapters to the list, keeping each reason once, oldest chapter first. */
export function mergeStale(current: StaleChapter[], incoming: StaleChapter[]): StaleChapter[] {
	const merged = new Map(current.map((entry) => [entry.capitulo, [...entry.motivos]]));
	for (const entry of incoming) {
		const motivos = merged.get(entry.capitulo) ?? [];
		merged.set(entry.capitulo, [...motivos, ...entry.motivos.filter((motivo) => !motivos.includes(motivo))]);
	}
	return [...merged.entries()].map(([capitulo, motivos]) => ({ capitulo, motivos })).sort(byChapter);
}

/** The writer confirmed `chapter` is reanalysed. Only the oldest stale chapter can be cleared: the order matters. */
export function confirmReanalysis(list: StaleChapter[], chapter: number): StaleChapter[] {
	const next = [...list].sort(byChapter)[0];
	if (!next || next.capitulo !== chapter) {
		throw new Error(next ? `Reanaliza antes el cap. ${next.capitulo}.` : "No hay capítulos desactualizados.");
	}
	return list.filter((entry) => entry.capitulo !== chapter);
}

export function parseStore(text: string | null): PropagationStore {
	if (!text) {
		return { base: {}, stale: {} };
	}
	const data = JSON.parse(text) as Partial<PropagationStore>;
	return { base: data.base ?? {}, stale: data.stale ?? {} };
}

function byChapter(a: StaleChapter, b: StaleChapter): number {
	return a.capitulo - b.capitulo;
}
