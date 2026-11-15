import { debounce, ItemView, MarkdownView, TFile, type WorkspaceLeaf } from "obsidian";

import { type EntityEntry, projectOf } from "./entities";
import { chapterOf, isSheetPath, peekAt, projectSheets } from "./peek";
import type { WorldSheets } from "./world";

export const PEEK_VIEW = "atlas-peek";

const KINDS = { personaje: "Personaje", lugar: "Lugar", objeto: "Objeto" } as const;

interface ProjectSheets {
	project: string;
	entities: EntityEntry[];
	sheets: WorldSheets;
}

/** Side panel: the sheet and chapter state of the entity under the editor cursor. Read-only. */
export class PeekView extends ItemView {
	private cache: ProjectSheets | null = null;
	private readonly update = debounce(() => void this.refresh(), 300, true);

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return PEEK_VIEW;
	}

	getDisplayText(): string {
		return "Vistazo de entidad";
	}

	getIcon(): string {
		return "eye";
	}

	async onOpen(): Promise<void> {
		this.registerEvent(this.app.workspace.on("editor-change", () => this.update()));
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.update()));
		this.registerDomEvent(document, "selectionchange", () => this.update());
		// Autosaves of the scene being written do not touch sheets: keep the cache.
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (this.cache && isSheetPath(this.cache.project, file.path)) {
					this.cache = null;
				}
			}),
		);
		this.registerEvent(this.app.vault.on("create", () => (this.cache = null)));
		this.registerEvent(this.app.vault.on("delete", () => (this.cache = null)));
		this.registerEvent(this.app.vault.on("rename", () => (this.cache = null)));
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) {
			// Focus is on this panel or a non-editor leaf: keep what is shown.
			if (this.contentEl.childElementCount === 0) {
				this.message("Abre una escena y sitúa el cursor sobre un nombre.");
			}
			return;
		}
		const path = view.file.path;
		const cursor = view.editor.getCursor();
		const { entities, sheets } = await this.projectSheets(projectOf(path));
		const chapter = chapterOf(path);
		const found = peekAt(view.editor.getLine(cursor.line), cursor.ch, entities, sheets, chapter);
		if (!found.ok) {
			this.message("Sin entidad conocida bajo el cursor.");
			return;
		}
		const { entidad, estado } = found;
		const { contentEl } = this;
		contentEl.empty();
		const title = contentEl.createEl("h4");
		this.link(title, entidad.path, entidad.nombre);
		const facts = [KINDS[entidad.tipo], ...(entidad.alias.length > 0 ? [`alias: ${entidad.alias.join(", ")}`] : [])];
		contentEl.createEl("p", { text: facts.join(" · ") });
		if (chapter === null) {
			contentEl.createEl("p", { text: "La nota no es de un capítulo (Cap NN): sin estado." });
			return;
		}
		contentEl.createEl("h5", { text: `En el capítulo ${chapter}` });
		if (estado.length === 0) {
			contentEl.createEl("p", { text: "Nada registrado en este capítulo." });
			return;
		}
		const list = contentEl.createEl("ul");
		for (const line of estado) {
			list.createEl("li", { text: line });
		}
	}

	/** Sheets are read once per project and dropped when a sheet changes; cursor moves reuse them. */
	private async projectSheets(project: string): Promise<ProjectSheets> {
		if (this.cache?.project === project) {
			return this.cache;
		}
		const files = this.app.vault.getMarkdownFiles().filter((file) => isSheetPath(project, file.path));
		const notes = await Promise.all(
			files.map(async (file) => ({ path: file.path, text: await this.app.vault.cachedRead(file) })),
		);
		this.cache = { project, ...projectSheets(project, notes) };
		return this.cache;
	}

	private message(text: string): void {
		this.contentEl.empty();
		this.contentEl.createEl("p", { text });
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
