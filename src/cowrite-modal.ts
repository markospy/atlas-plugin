import { type App, type Editor, Modal, Notice } from "obsidian";

import { COWRITE_MODES, type CoWriteMode, type CoWriteSession, type Proposal } from "./cowrite";

const MODE_LABELS: Record<CoWriteMode, string> = {
	borrador: "Borrador",
	alternativa: "Alternativa",
	continuacion: "Continuación",
};

const DIFF_MARK = { igual: "  ", quitar: "- ", añadir: "+ " } as const;

/**
 * Pick a mode, see the diff, approve or reject. Only "Aprobar" writes to the note, and only
 * after `backup` saved the current text: a failed backup leaves the note untouched.
 */
export class CoWriteModal extends Modal {
	constructor(
		app: App,
		private readonly editor: Editor,
		private readonly session: CoWriteSession,
		private readonly ask: (modo: CoWriteMode, actual: string) => Promise<Proposal>,
		private readonly backup: (actual: string) => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Co-escribir escena" });
		for (const modo of COWRITE_MODES) {
			const button = contentEl.createEl("button", { text: MODE_LABELS[modo] });
			button.addEventListener("click", () => void this.request(modo));
		}
	}

	private async request(modo: CoWriteMode): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("p", { text: "Pidiendo propuesta…" });
		let proposal: Proposal;
		try {
			proposal = await this.ask(modo, this.editor.getValue());
		} catch (error) {
			new Notice(error instanceof Error ? error.message : "No se pudo pedir la propuesta.");
			this.close();
			return;
		}
		this.showDiff(proposal);
	}

	private async approve(proposal: Proposal): Promise<void> {
		try {
			if (this.editor.getValue() !== proposal.actual) {
				throw new Error("La nota cambió desde la propuesta. Pide una nueva.");
			}
			await this.backup(proposal.actual);
			this.editor.setValue(this.session.aprobar(proposal, this.editor.getValue()));
			new Notice("Cambio aplicado. Hay respaldo de la versión anterior.");
		} catch (error) {
			new Notice(error instanceof Error ? error.message : "No se aplicó el cambio.");
		}
		this.close();
	}

	private showDiff(proposal: Proposal): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: `${MODE_LABELS[proposal.modo]} · diff` });
		const pre = contentEl.createEl("pre");
		for (const line of proposal.diff) {
			pre.createEl("div", { text: `${DIFF_MARK[line.tipo]}${line.texto}`, cls: `atlas-diff-${line.tipo}` });
		}
		const approve = contentEl.createEl("button", { text: "Aprobar", cls: "mod-cta" });
		approve.addEventListener("click", () => void this.approve(proposal));
		const reject = contentEl.createEl("button", { text: "Rechazar" });
		reject.addEventListener("click", () => {
			this.session.rechazar(proposal);
			this.close();
		});
	}
}
