import { ItemView, MarkdownView, TFile, type WorkspaceLeaf } from "obsidian";

import { collectMarkers } from "./markers";

export const MARKER_VIEW = "atlas-markers";

export class MarkerView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return MARKER_VIEW;
	}

	getDisplayText(): string {
		return "Marcadores Atlas";
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const notes = this.app.vault.getMarkdownFiles().flatMap((file) => {
			if (!isManuscript(file.path)) {
				return [];
			}
			return [{ path: file.path, text: "", file }];
		});
		const withText = await Promise.all(
			notes.map(async (note) => ({
				path: note.path,
				text: await this.app.vault.read(note.file),
				file: note.file,
			})),
		);
		const listed = collectMarkers(withText);
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Marcadores" });
		if (listed.length === 0) {
			contentEl.createEl("p", { text: "No hay [TK] ni [INVESTIGAR] en el manuscrito." });
			return;
		}
		const list = contentEl.createEl("ul");
		for (const item of listed) {
			const file = withText.find((note) => note.path === item.path)?.file;
			const line = list.createEl("li");
			const link = line.createEl("a", {
				text: `${item.path}:${item.marker.line} ${item.marker.label}`,
				href: item.path,
			});
			link.addEventListener("click", (event) => {
				event.preventDefault();
				if (file) {
					void this.openMarker(file, item.marker.line);
				}
			});
		}
	}

	private async openMarker(file: TFile, line: number): Promise<void> {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		view?.editor.setCursor({ line: line - 1, ch: 0 });
	}
}

function isManuscript(path: string): boolean {
	return path.startsWith("Manuscrito/") || path.includes("/Manuscrito/");
}
