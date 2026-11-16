import { ItemView, TFile, type WorkspaceLeaf } from "obsidian";

import { projectOf } from "./entities";
import { forgottenObjects, openClues } from "./foreshadow";

export const FORESHADOW_VIEW = "atlas-foreshadow";

export class ForeshadowView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return FORESHADOW_VIEW;
	}

	getDisplayText(): string {
		return "Pistas sin resolver";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createEl("p", { text: "Ejecuta «Tablero de foreshadowing» desde una nota del proyecto." });
	}

	async refresh(): Promise<void> {
		const project = projectOf(this.app.workspace.getActiveFile()?.path ?? "");
		const prefix = project.length > 0 ? `${project}/` : "";
		const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix));
		const notes = await Promise.all(
			files.map(async (file) => ({ path: file.path, text: await this.app.vault.cachedRead(file) })),
		);
		const clues = openClues(project, notes);
		const forgotten = forgottenObjects(project, notes);
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Pistas sin resolver" });
		if (clues.length === 0) {
			contentEl.createEl("p", { text: "No hay pistas abiertas en este proyecto." });
		} else {
			const list = contentEl.createEl("ul");
			for (const clue of clues) {
				const item = list.createEl("li");
				this.link(item, clue.path, clue.nombre || clue.path);
				item.appendText(` · ${clue.estado || "sin estado"}${clue.sembrado ? ` · ${clue.sembrado}` : ""}`);
			}
		}
		if (forgotten.length > 0) {
			contentEl.createEl("h4", { text: "Objetos que no vuelven" });
			const list = contentEl.createEl("ul");
			for (const object of forgotten) {
				const item = list.createEl("li");
				this.link(item, object.path, object.nombre);
				item.appendText(object.escenas.length === 0 ? " · no aparece en el manuscrito" : " · solo aparece una vez");
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
