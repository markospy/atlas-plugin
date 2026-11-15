import type { ChapterMemory } from "./memory.ts";

export type FactEdgeKind = "introduce" | "usa";

/** A chapter introduces a fact (`hechos`) or uses it (`usos`) in its `_Memoria/Cap NN` note. */
export interface FactEdge {
	capitulo: number;
	hecho: string;
	tipo: FactEdgeKind;
}

export interface FactGraph {
	edges: FactEdge[];
	/** Uses with no introducing chapter at or before them: the memory is incomplete, so is the graph. */
	avisos: string[];
}

export function buildFactGraph(memories: ChapterMemory[]): FactGraph {
	const seen = new Set<string>();
	const edges: FactEdge[] = [];
	const add = (capitulo: number, hecho: string, tipo: FactEdgeKind) => {
		const key = `${capitulo}|${hecho}|${tipo}`;
		if (hecho.length > 0 && !seen.has(key)) {
			seen.add(key);
			edges.push({ capitulo, hecho, tipo });
		}
	};
	for (const memory of memories) {
		memory.hechos.forEach((fact) => add(memory.capitulo, fact.id, "introduce"));
		memory.usos.forEach((use) => add(memory.capitulo, use.hecho, "usa"));
	}
	edges.sort((a, b) => a.capitulo - b.capitulo || a.tipo.localeCompare(b.tipo) || a.hecho.localeCompare(b.hecho));
	const avisos = edges
		.filter(
			(use) =>
				use.tipo === "usa" &&
				!edges.some((edge) => edge.tipo === "introduce" && edge.hecho === use.hecho && edge.capitulo <= use.capitulo),
		)
		.map((use) => `El cap. ${use.capitulo} usa «${use.hecho}», que no se introduce en ningún capítulo anterior.`);
	return { edges, avisos };
}

/** Chapters that use `fact` without introducing it themselves: the ones to re-check when it changes. */
export function dependents(graph: FactGraph, fact: string): number[] {
	const introduced = chaptersOf(graph, fact, "introduce");
	return chaptersOf(graph, fact, "usa").filter((chapter) => !introduced.includes(chapter));
}

/** Debug dump: per fact, who introduces and who uses it, plus the raw edges and warnings. */
export function graphDump(graph: FactGraph): string {
	const facts = [...new Set(graph.edges.map((edge) => edge.hecho))].sort();
	const hechos = Object.fromEntries(
		facts.map((fact) => [fact, { introduce: chaptersOf(graph, fact, "introduce"), usa: chaptersOf(graph, fact, "usa") }]),
	);
	return JSON.stringify({ hechos, aristas: graph.edges, avisos: graph.avisos }, null, 2);
}

function chaptersOf(graph: FactGraph, fact: string, tipo: FactEdgeKind): number[] {
	return graph.edges.filter((edge) => edge.hecho === fact && edge.tipo === tipo).map((edge) => edge.capitulo);
}
