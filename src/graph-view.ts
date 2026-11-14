import { ItemView, type WorkspaceLeaf } from "obsidian";

import { parseCharacter } from "./characters";
import { buildGraph, circleLayout, filterGraph, relationTypes, type GraphFilter, type RelationGraph } from "./graph";

export const GRAPH_VIEW = "atlas-graph";

const SIZE = 400;

export class GraphView extends ItemView {
	private graph: RelationGraph = { nodes: [], edges: [] };
	private filter: GraphFilter = {};

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return GRAPH_VIEW;
	}

	getDisplayText(): string {
		return "Grafo de relaciones";
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles().filter((file) => isCharacter(file.path));
		const characters = await Promise.all(
			files.map(async (file) => ({
				name: file.basename,
				relaciones: parseCharacter(await this.app.vault.read(file)).relaciones,
			})),
		);
		this.graph = buildGraph(characters);
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Grafo de relaciones" });
		if (this.graph.nodes.length === 0) {
			contentEl.createEl("p", { text: "No hay fichas de personaje con relaciones." });
			return;
		}

		const controls = contentEl.createDiv();
		const type = controls.createEl("select");
		type.createEl("option", { text: "Todos los tipos", value: "" });
		for (const tipo of relationTypes(this.graph)) {
			type.createEl("option", { text: tipo, value: tipo });
		}
		type.value = this.filter.tipo ?? "";
		type.addEventListener("change", () => {
			this.filter = { ...this.filter, tipo: type.value || undefined };
			this.render();
		});
		const chapter = controls.createEl("input", { type: "number", placeholder: "Capítulo" });
		chapter.min = "0";
		chapter.value = this.filter.capitulo === undefined ? "" : String(this.filter.capitulo);
		chapter.addEventListener("change", () => {
			const value = chapter.value.trim();
			this.filter = { ...this.filter, capitulo: value === "" ? undefined : Number(value) };
			this.render();
		});

		const shown = filterGraph(this.graph, this.filter);
		const placed = new Map(circleLayout(shown.nodes, SIZE).map((node) => [node.name, node]));
		const svg = contentEl.createSvg("svg", {
			attr: { viewBox: `0 0 ${SIZE} ${SIZE}`, width: "100%", role: "img" },
		});
		for (const edge of shown.edges) {
			const from = placed.get(edge.from);
			const to = placed.get(edge.to);
			if (!from || !to) {
				continue;
			}
			svg.createSvg("line", {
				attr: { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: "var(--text-muted)" },
			});
			const label = svg.createSvg("text", {
				attr: {
					x: (from.x + to.x) / 2,
					y: (from.y + to.y) / 2,
					"text-anchor": "middle",
					"font-size": 10,
					fill: "var(--text-muted)",
				},
			});
			label.textContent = edge.tipo;
		}
		for (const node of placed.values()) {
			svg.createSvg("circle", { attr: { cx: node.x, cy: node.y, r: 6, fill: "var(--interactive-accent)" } });
			const name = svg.createSvg("text", {
				attr: { x: node.x, y: node.y - 10, "text-anchor": "middle", "font-size": 12, fill: "var(--text-normal)" },
			});
			name.textContent = node.name;
		}
	}
}

function isCharacter(path: string): boolean {
	return path.startsWith("Personajes/") || path.includes("/Personajes/");
}
