import type { CharacterRelation } from "./characters";

export interface GraphEdge {
	from: string;
	to: string;
	tipo: string;
	desde: number | null;
	hasta: number | null;
}

export interface RelationGraph {
	nodes: string[];
	edges: GraphEdge[];
}

export interface GraphFilter {
	tipo?: string;
	capitulo?: number;
}

export interface PlacedNode {
	name: string;
	x: number;
	y: number;
}

export function linkTarget(link: string): string {
	const inner = link.trim().replace(/^\[\[/, "").replace(/\]\]$/, "");
	const target = (inner.split("|")[0] ?? "").split("#")[0] ?? "";
	// Obsidian writes `[[Folder/Name]]` when two notes share a name; the node is the note name.
	return target.split("/").pop()?.trim() ?? "";
}

// Character notes directly inside one project's `Personajes` folder (see `characterFolder`).
export function projectCharacterPaths(paths: string[], folder: string): string[] {
	const prefix = `${folder}/`;
	return paths.filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"));
}

export function chapterNumber(link: string | undefined): number | null {
	if (!link) {
		return null;
	}
	const digits = linkTarget(link).match(/\d+/g);
	const last = digits?.[digits.length - 1];
	return last === undefined ? null : Number(last);
}

export function buildGraph(characters: { name: string; relaciones: CharacterRelation[] }[]): RelationGraph {
	const nodes = new Set<string>();
	const edges: GraphEdge[] = [];
	for (const character of characters) {
		nodes.add(character.name);
		for (const relation of character.relaciones) {
			const to = linkTarget(relation.con);
			if (to.length === 0) {
				continue;
			}
			nodes.add(to);
			edges.push({
				from: character.name,
				to,
				tipo: relation.tipo,
				desde: chapterNumber(relation.desde),
				hasta: chapterNumber(relation.hasta),
			});
		}
	}
	return { nodes: [...nodes].sort(), edges };
}

export function relationTypes(graph: RelationGraph): string[] {
	return [...new Set(graph.edges.map((edge) => edge.tipo))].sort();
}

// `desde` and `hasta` are inclusive; a missing bound is open.
export function activeInChapter(edge: GraphEdge, chapter: number): boolean {
	return (edge.desde === null || edge.desde <= chapter) && (edge.hasta === null || chapter <= edge.hasta);
}

export function filterGraph(graph: RelationGraph, filter: GraphFilter): RelationGraph {
	const edges = graph.edges.filter(
		(edge) =>
			(!filter.tipo || edge.tipo === filter.tipo) &&
			(filter.capitulo === undefined || activeInChapter(edge, filter.capitulo)),
	);
	return { nodes: graph.nodes, edges };
}

export function circleLayout(nodes: string[], size: number): PlacedNode[] {
	const center = size / 2;
	const radius = nodes.length > 1 ? size * 0.38 : 0;
	return nodes.map((name, index) => {
		const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
		return {
			name,
			x: Math.round(center + radius * Math.cos(angle)),
			y: Math.round(center + radius * Math.sin(angle)),
		};
	});
}
