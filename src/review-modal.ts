import { type App, type Editor, Modal } from "obsidian";

import type { ReviewFinding } from "./review";

/** Lists AI findings; a click only moves the cursor. Nothing here edits the note. */
export class ReviewModal extends Modal {
	constructor(
		app: App,
		private readonly editor: Editor,
		private readonly hallazgos: ReviewFinding[],
		private readonly descartados: number,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Revisión con IA" });
		contentEl.createEl("p", { text: "Propuestas del modelo: tú decides qué cambiar." });
		if (this.hallazgos.length === 0) {
			contentEl.createEl("p", { text: "Sin hallazgos en esta escena." });
		}
		const list = contentEl.createEl("ul");
		for (const finding of this.hallazgos) {
			const link = list.createEl("li").createEl("a", {
				text: `Línea ${finding.linea} · ${finding.tipo}: ${finding.mensaje} «${finding.cita}»`,
				href: "#",
			});
			link.addEventListener("click", (event) => {
				event.preventDefault();
				this.editor.setCursor({ line: finding.linea - 1, ch: finding.columna - 1 });
				this.close();
			});
		}
		if (this.descartados > 0) {
			contentEl.createEl("p", { text: `${this.descartados} hallazgo(s) descartado(s): tipo desconocido o cita que no está en la escena.` });
		}
	}
}
