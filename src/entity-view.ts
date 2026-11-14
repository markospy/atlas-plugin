import { ItemView, TFile, type WorkspaceLeaf } from "obsidian";

import { buildEntityIndex, projectOf } from "./entities";

export const ENTITY_VIEW = "atlas-entities";

const HEADINGS = { personaje: "Personajes", lugar: "Lugares", objeto: "Objetos" } as const;

export class EntityView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return ENTITY_VIEW;
	}

	getDisplayText(): string {
		return "Índice de entidades";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createEl("p", { text: "Ejecuta «Índice de entidades» para escanear el manuscrito." });
	}

	/** Scans on demand: called when the view opens or the command runs, never on every edit. */
	async refresh(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const project = projectOf(active?.path ?? "");
		const prefix = project.length > 0 ? `${project}/` : "";
		const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix));
		const notes = await Promise.all(
			files.map(async (file) => ({ path: file.path, text: await this.app.vault.cachedRead(file) })),
		);
		const index = buildEntityIndex(project, notes);
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Índice de entidades" });
		if (index.length === 0) {
			contentEl.createEl("p", { text: "No hay personajes, lugares ni objetos en este proyecto." });
			return;
		}
		for (const tipo of ["personaje", "lugar", "objeto"] as const) {
			const entries = index.filter((entry) => entry.tipo === tipo);
			if (entries.length === 0) {
				continue;
			}
			contentEl.createEl("h4", { text: HEADINGS[tipo] });
			const list = contentEl.createEl("ul");
			for (const entry of entries) {
				const item = list.createEl("li");
				this.link(item, entry.path, entry.nombre);
				const scenes = item.createEl("ul");
				if (entry.escenas.length === 0) {
					scenes.createEl("li", { text: "Sin apariciones." });
				}
				for (const scene of entry.escenas) {
					this.link(scenes.createEl("li"), scene, scene.slice(scene.lastIndexOf("/") + 1).replace(/\.md$/i, ""));
				}
			}
		}
	}

	private link(parent: HTMLElement, path: string, text: string): void {
		const anchor = parent.createEl("a", { text, href: path });
		anchor.addEventListener("click", (event) => {
			event.preventDefault();
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				void this.app.workspace.getLeaf(false).openFile(file);
			}
		});
	}
}
