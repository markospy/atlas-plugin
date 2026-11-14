import { type App, type Editor, Modal } from "obsidian";

import { ignoreHere, lint, type LintRule } from "./linter";

export class LintModal extends Modal {
	constructor(
		app: App,
		private readonly editor: Editor,
		private readonly rules: LintRule[],
	) {
		super(app);
	}

	onOpen(): void {
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h3", { text: "Estilo" });
		const findings = lint(this.editor.getValue(), this.rules);
		if (findings.length === 0) {
			contentEl.createEl("p", { text: "Sin hallazgos en esta nota." });
			return;
		}
		const list = contentEl.createEl("ul");
		for (const finding of findings) {
			const item = list.createEl("li");
			const link = item.createEl("a", {
				text: `Línea ${finding.line} · ${finding.severidad}: ${finding.message} «${finding.match}»`,
				href: "#",
			});
			link.addEventListener("click", (event) => {
				event.preventDefault();
				this.editor.setCursor({ line: finding.line - 1, ch: finding.column - 1 });
				this.close();
			});
			const ignore = item.createEl("button", { text: "Ignorar aquí" });
			ignore.addEventListener("click", () => {
				const lines = ignoreHere(this.editor.getValue(), finding).split("\n");
				this.editor.setLine(finding.line - 1, lines[finding.line - 1] ?? "");
				this.render();
			});
		}
	}
}
