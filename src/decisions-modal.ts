import { type App, Modal, Notice } from "obsidian";

import type { Decision, PendingChapter } from "./decisions";

export interface DecisionRow {
	decision: Decision;
	pendientes: PendingChapter[];
}

export interface DecisionActions {
	add: (input: { antiguo: string; nuevo: string; desde: number }) => Promise<DecisionRow[]>;
	align: (id: string, chapter: number) => Promise<DecisionRow[]>;
	open: (path: string) => void;
}

/** Canon decisions going forward, each with the earlier chapters still to align. Nothing is rewritten. */
export class DecisionsModal extends Modal {
	constructor(
		app: App,
		private rows: DecisionRow[],
		private readonly actions: DecisionActions,
	) {
		super(app);
	}

	onOpen(): void {
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Registro de decisiones" });
		const form = contentEl.createDiv();
		const antiguo = form.createEl("input", { type: "text", placeholder: "Valor antiguo (posada del Ciervo)" });
		const nuevo = form.createEl("input", { type: "text", placeholder: "Valor nuevo (El Reyezuelo)" });
		const desde = form.createEl("input", { type: "number", placeholder: "Desde el cap." });
		const add = form.createEl("button", { text: "Registrar decisión" });
		add.addEventListener("click", () => {
			this.update(
				this.actions.add({ antiguo: antiguo.value, nuevo: nuevo.value, desde: Number(desde.value) }),
			);
		});
		if (this.rows.length === 0) {
			contentEl.createEl("p", { text: "Aún no hay decisiones." });
			return;
		}
		for (const { decision, pendientes } of this.rows) {
			const item = contentEl.createDiv();
			item.createEl("h4", { text: `«${decision.antiguo}» → «${decision.nuevo}» desde el cap. ${decision.desde}` });
			if (pendientes.length === 0) {
				item.createEl("p", { text: "Ningún capítulo anterior pendiente de alinear." });
				continue;
			}
			const list = item.createEl("ul");
			for (const pending of pendientes) {
				const line = list.createEl("li", { text: `Cap. ${pending.capitulo} · ${pending.escenas.length} escena(s) ` });
				const open = line.createEl("button", { text: "Abrir" });
				open.addEventListener("click", () => {
					const first = pending.escenas[0];
					if (first) {
						this.actions.open(first);
						this.close();
					}
				});
				const done = line.createEl("button", { text: "Marcar alineado" });
				done.addEventListener("click", () => {
					this.update(this.actions.align(decision.id, pending.capitulo));
				});
			}
		}
	}

	private update(next: Promise<DecisionRow[]>): void {
		next
			.then((rows) => {
				this.rows = rows;
				this.render();
			})
			.catch((error: unknown) => new Notice(error instanceof Error ? error.message : String(error)));
	}
}
