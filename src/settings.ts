import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

import { assertAllowedEndpoint, type ProviderSettings } from "./providers";

export interface ProviderHost {
	settings: ProviderSettings;
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
	}
}
