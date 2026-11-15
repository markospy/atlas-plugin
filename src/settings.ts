import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

import { assertAllowedEndpoint, type ProviderSettings } from "./providers";
import { parseDailyGoal } from "./stats";

/** Daily word goal when none is set; 0 turns the goal off. */
export const DEFAULT_DAILY_GOAL = 500;

export interface AtlasSettings extends ProviderSettings {
	/** Words per day; 0 means no daily goal. */
	metaDiaria: number;
}

export interface ProviderHost {
	settings: AtlasSettings;
	saveSettings(): Promise<void>;
}

export class AtlasSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly host: Plugin & ProviderHost) {
		super(app, host);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Atlas" });

		new Setting(containerEl)
			.setName("Endpoint")
			.setDesc("Ollama, LM Studio u otro endpoint compatible. Vacío: no hay proveedor y el resto del plugin sigue usable.")
			.addText((text) => {
				text
					.setPlaceholder("http://127.0.0.1:11434")
					.setValue(this.host.settings.endpoint)
					.onChange(async (value) => {
						this.host.settings.endpoint = value.trim();
						await this.host.saveSettings();
						if (this.host.settings.endpoint.length === 0) {
							return;
						}
						try {
							assertAllowedEndpoint(this.host.settings, this.host.settings.endpoint);
						} catch (error) {
							const message = error instanceof Error ? error.message : "Host no permitido.";
							new Notice(message);
						}
					});
			});

		new Setting(containerEl)
			.setName("Modelo")
			.setDesc("Nombre del modelo en el endpoint, por ejemplo llama3.2. Lo usan «Revisar escena con IA» y «Co-escribir escena».")
			.addText((text) => {
				text.setValue(this.host.settings.model).onChange(async (value) => {
					this.host.settings.model = value.trim();
					await this.host.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Permitir nube")
			.setDesc("Sin este opt-in solo se aceptan localhost, 127.0.0.1 y ::1.")
			.addToggle((toggle) => {
				toggle.setValue(this.host.settings.cloudOptIn).onChange(async (value) => {
					this.host.settings.cloudOptIn = value;
					await this.host.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Lista blanca")
			.setDesc("Hosts de nube, separados por coma. Cualquier otro host se rechaza.")
			.addText((text) => {
				text.setValue(this.host.settings.allowedHosts.join(", ")).onChange(async (value) => {
					this.host.settings.allowedHosts = value
						.split(",")
						.map((host) => host.trim())
						.filter((host) => host.length > 0);
					await this.host.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Meta diaria")
			.setDesc("Palabras por día del manuscrito. 0: sin meta. La racha y el progreso se guardan solo en esta bóveda.")
			.addText((text) => {
				text.setValue(String(this.host.settings.metaDiaria)).onChange(async (value) => {
					const goal = parseDailyGoal(value);
					if (goal === undefined) {
						// An empty field is the writer retyping: keep the old goal without a warning.
						if (value.length > 0) {
							new Notice("Meta diaria: escribe solo un número entero (0: sin meta).");
						}
						return;
					}
					this.host.settings.metaDiaria = goal;
					await this.host.saveSettings();
				});
			});
	}
}
