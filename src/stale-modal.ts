import { type App, Modal, Notice } from "obsidian";

import type { StaleChapter } from "./stale";

/** Stale chapters, oldest first. Only the oldest can be confirmed as reanalysed; any can be opened to fix by hand. */
export class StaleModal extends Modal {
	constructor(
		app: App,
		private list: StaleChapter[],
		private readonly confirm: (chapter: number) => Promise<StaleChapter[]>,
		private readonly openChapter: (chapter: number) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Capítulos desactualizados" });
		if (this.list.length === 0) {
			contentEl.createEl("p", { text: "Ningún capítulo está desactualizado." });
			return;
		}
		contentEl.createEl("p", { text: "Reanaliza en orden: el más antiguo primero. Nada se reescribe solo." });
		this.list.forEach((entry, index) => {
			const item = contentEl.createDiv();
			item.createEl("h4", { text: `Cap. ${entry.capitulo}` });
			const reasons = item.createEl("ul");
			entry.motivos.forEach((motivo) => reasons.createEl("li", { text: motivo }));
			const open = item.createEl("button", { text: "Abrir para corregir" });
			open.addEventListener("click", () => {
				this.openChapter(entry.capitulo);
				this.close();
			});
			if (index === 0) {
				const done = item.createEl("button", { text: "Confirmar: ya está reanalizado" });
				done.addEventListener("click", () => {
					this.confirm(entry.capitulo)
						.then((list) => {
							this.list = list;
							this.render();
						})
						.catch((error: unknown) => new Notice(error instanceof Error ? error.message : String(error)));
				});
			}
		});
	}
}
