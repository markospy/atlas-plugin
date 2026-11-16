import { type App, Modal, Setting } from "obsidian";

import { type ExportFormat, exportFormats, NO_PANDOC } from "./export";

const LABELS: Record<ExportFormat, string> = { docx: "DOCX (Word)", epub: "EPUB", pdf: "PDF" };

/** Asks for the format and the vault folder, then hands both to `onExport`. */
export class ExportModal extends Modal {
	constructor(
		app: App,
		private readonly hasPandoc: boolean,
		private folder: string,
		private readonly onExport: (format: ExportFormat, folder: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Exportar manuscrito" });
		let format: ExportFormat = "docx";
		new Setting(contentEl).setName("Formato").addDropdown((dropdown) => {
			for (const option of exportFormats(this.hasPandoc)) {
				dropdown.addOption(option, LABELS[option]);
			}
			dropdown.setValue(format).onChange((value) => {
				format = value as ExportFormat;
			});
		});
		if (!this.hasPandoc) {
			contentEl.createEl("p", { text: NO_PANDOC });
		}
		new Setting(contentEl)
			.setName("Carpeta")
			.setDesc("Ruta dentro de la bóveda. Se crea si no existe.")
			.addText((text) =>
				text.setValue(this.folder).onChange((value) => {
					this.folder = value.trim().replace(/^\/+|\/+$/g, "");
				}),
			);
		new Setting(contentEl).addButton((button) =>
			button
				.setButtonText("Exportar")
				.setCta()
				.onClick(() => {
					this.close();
					this.onExport(format, this.folder);
				}),
		);
	}
}
