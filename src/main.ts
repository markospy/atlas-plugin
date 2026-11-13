import { Notice, Plugin, TFile, type Vault } from "obsidian";

import { DEFAULT_PROVIDER_SETTINGS, type ProviderSettings } from "./providers";
import { AtlasSettingTab } from "./settings";
import { createAtlasProject, type AtlasFiles } from "./vault";

function filesFromVault(vault: Vault): AtlasFiles {
	return {
		exists: (path) => vault.adapter.exists(path),
		createFolder: async (path) => {
			await vault.createFolder(path);
		},
		read: (path) => vault.adapter.read(path),
		write: async (path, data) => {
			const current = vault.getAbstractFileByPath(path);
			if (current instanceof TFile) {
				await vault.modify(current, data);
				return;
			}
			await vault.create(path, data);
		},
	};
}

export default class AtlasPlugin extends Plugin {
	settings: ProviderSettings = { ...DEFAULT_PROVIDER_SETTINGS };

	async onload(): Promise<void> {
		const stored = (await this.loadData()) as Partial<ProviderSettings> | null;
		this.settings = {
			...DEFAULT_PROVIDER_SETTINGS,
			...stored,
			allowedHosts: stored?.allowedHosts ?? [],
		};
		this.addSettingTab(new AtlasSettingTab(this.app, this));
		this.addCommand({
			id: "new-project",
			name: "Nuevo proyecto Atlas",
			callback: () => {
				void this.newProject();
			},
		});
	}

	private async newProject(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			new Notice("Abre la nota índice del proyecto.");
			return;
		}
		await createAtlasProject(filesFromVault(this.app.vault), file.path);
		new Notice("Proyecto Atlas listo.");
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
