import { Notice, Plugin, TFile, type Vault } from "obsidian";

import { characterFolder, characterNote, parseCharacter, relationErrors } from "./characters";
import { placeFolder, placeNote } from "./places";
import { PLOT_STRUCTURES, plotFolder, plotNote, SCENE_FIELDS, type PlotStructure } from "./plot";
import { MARKER_VIEW, MarkerView } from "./marker-view";
import { DEFAULT_PROVIDER_SETTINGS, type ProviderSettings } from "./providers";
import { AtlasSettingTab } from "./settings";
import { skillFolder, skillNote } from "./style";
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
		this.registerView(MARKER_VIEW, (leaf) => new MarkerView(leaf));
		this.addCommand({
			id: "insert-tk",
			name: "Insertar [TK]",
			editorCallback: (editor) => {
				editor.replaceSelection("[TK]");
			},
		});
		this.addCommand({
			id: "insert-investigar",
			name: "Insertar [INVESTIGAR]",
			editorCallback: (editor) => {
				editor.replaceSelection("[INVESTIGAR: ]");
			},
		});
		this.addCommand({
			id: "show-markers",
			name: "Marcadores del manuscrito",
			callback: () => {
				void this.openMarkers();
			},
		});
		this.addCommand({
			id: "new-character",
			name: "Nueva ficha de personaje",
			editorCallback: (editor) => {
				void this.newCharacter(editor.getSelection().trim());
			},
		});
		this.addCommand({
			id: "check-character-relations",
			name: "Comprobar relaciones del personaje",
			editorCallback: (editor) => {
				const errors = relationErrors(parseCharacter(editor.getValue()).relaciones);
				new Notice(errors.length === 0 ? "Relaciones válidas." : errors.join(" "));
			},
		});
		this.addCommand({
			id: "new-place",
			name: "Nuevo lugar",
			editorCallback: (editor) => {
				void this.newPlace(editor.getSelection().trim());
			},
		});
		for (const [structure, { nombre }] of Object.entries(PLOT_STRUCTURES)) {
			this.addCommand({
				id: `new-plot-${structure}`,
				name: `Nueva trama (${nombre})`,
				editorCallback: (editor) => {
					void this.newPlot(editor.getSelection().trim(), structure as PlotStructure);
				},
			});
		}
		this.addCommand({
			id: "add-scene-fields",
			name: "Añadir campos de escena",
			callback: () => {
				void this.addSceneFields();
			},
		});
		this.addCommand({
			id: "new-skill",
			name: "Nueva skill de estilo",
			editorCallback: (editor) => {
				void this.newSkill(editor.getSelection().trim());
			},
		});
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

	private async newCharacter(name: string): Promise<void> {
		if (name.length === 0) {
			new Notice("Selecciona el nombre del personaje.");
			return;
		}
		if (name.includes("/") || name.includes("\\")) {
			new Notice("El nombre no puede incluir carpetas.");
			return;
		}
		const active = this.app.workspace.getActiveFile();
		const folder = characterFolder(active?.path ?? "");
		const path = `${folder}/${name}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Esa ficha ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, characterNote(name));
		new Notice("Ficha creada.");
	}

	private async newPlace(name: string): Promise<void> {
		if (name.length === 0) {
			new Notice("Selecciona el nombre del lugar.");
			return;
		}
		if (name.includes("/") || name.includes("\\")) {
			new Notice("El nombre no puede incluir carpetas.");
			return;
		}
		const active = this.app.workspace.getActiveFile();
		const folder = placeFolder(active?.path ?? "");
		const path = `${folder}/${name}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Ese lugar ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, placeNote(name));
		new Notice("Lugar creado.");
	}

	private async newPlot(name: string, structure: PlotStructure): Promise<void> {
		if (name.length === 0) {
			new Notice("Selecciona el nombre de la trama.");
			return;
		}
		if (name.includes("/") || name.includes("\\")) {
			new Notice("El nombre no puede incluir carpetas.");
			return;
		}
		const active = this.app.workspace.getActiveFile();
		const folder = plotFolder(active?.path ?? "");
		const path = `${folder}/${name}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Esa trama ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, plotNote(name, structure));
		new Notice("Trama creada.");
	}

	private async addSceneFields(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			new Notice("Abre una escena del manuscrito.");
			return;
		}
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
				for (const field of SCENE_FIELDS) {
					if (!(field in frontmatter)) {
						frontmatter[field] = "";
					}
				}
			});
		} catch {
			new Notice("El frontmatter de la escena no es YAML válido.");
			return;
		}
		new Notice("Campos de escena listos.");
	}

	private async newSkill(name: string): Promise<void> {
		if (name.length === 0) {
			new Notice("Selecciona el nombre de la skill.");
			return;
		}
		if (name.includes("/") || name.includes("\\")) {
			new Notice("El nombre no puede incluir carpetas.");
			return;
		}
		const active = this.app.workspace.getActiveFile();
		const folder = skillFolder(active?.path ?? "");
		const path = `${folder}/${name}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Esa skill ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, skillNote(name));
		new Notice("Skill creada.");
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async openMarkers(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(MARKER_VIEW);
		const leaf = existing[0] ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}
		if (existing.length === 0) {
			await leaf.setViewState({ type: MARKER_VIEW, active: true });
		}
		await this.app.workspace.revealLeaf(leaf);
		if (leaf.view instanceof MarkerView) {
			await leaf.view.refresh();
		}
	}
}
