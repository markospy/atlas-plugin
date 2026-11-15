import { type DataAdapter, type Editor, FileSystemAdapter, Notice, Platform, Plugin, requestUrl, TFile, type Vault } from "obsidian";

import { backup, type BackupFiles, listBackups, restore } from "./backup";
import { chronologyNotice, impossibleTravels, readChronology } from "./chronology";
import { CoWriteSession, coWriteContext, propose, type CoWriteMode } from "./cowrite";
import { CoWriteModal } from "./cowrite-modal";
import { characterFolder, characterNote, parseCharacter, relationErrors } from "./characters";
import { frontmatterBody, scalar } from "./frontmatter";
import { GRAPH_VIEW, GraphView } from "./graph-view";
import { checkContinuity, usageErrors } from "./continuity";
import { buildFactGraph, dependents, graphDump } from "./dependencies";
import { ENTITY_VIEW, EntityView } from "./entity-view";
import { type ExportIO, exportManuscript, exportMessage, manuscriptScenes, sceneOrder } from "./export";
import { ExportModal } from "./export-modal";
import { clueFolder, clueNote, nextState } from "./foreshadow";
import { FORESHADOW_VIEW, ForeshadowView } from "./foreshadow-view";
import { objectFolder, objectNote, parseObject } from "./objects";
import { parsePlace, placeFolder, placeNote } from "./places";
import {
	type ChapterMemory,
	chapterNumber,
	knowledgeErrors,
	memoryFolder,
	memoryNote,
	memoryNoteName,
	parseMemory,
	projectMemoryFolder,
	READER,
	whatKnows,
} from "./memory";
import { PLOT_STRUCTURES, plotFolder, plotNote, SCENE_FIELDS, type PlotStructure } from "./plot";
import { BASE_RULES, patternRules } from "./linter";
import { LintModal } from "./lint-modal";
import { MARKER_VIEW, MarkerView } from "./marker-view";
import { chapterOf } from "./peek";
import { PEEK_VIEW, PeekView } from "./peek-view";
import { DEFAULT_PROVIDER_SETTINGS, ollamaProvider, type ProviderSettings } from "./providers";
import { NO_PROVIDER, providerReady, reviewScene } from "./review";
import { RestoreModal } from "./restore-modal";
import { ReviewModal } from "./review-modal";
import { confirmReanalysis, factChanges, mergeStale, parseStore, staleFrom, type PropagationStore, type StaleChapter } from "./stale";
import { StaleModal } from "./stale-modal";
import { AtlasSettingTab } from "./settings";
import { projectOf } from "./entities";
import { inProject } from "./sheets";
import { parseSkill, skillFolder, skillNote, skillsFor } from "./style";
import { childPath, createAtlasProject, parentPath, type AtlasFiles } from "./vault";

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

/** pandoc run from the vault root, or null on mobile or when `pandoc --version` fails. */
async function findPandoc(adapter: DataAdapter): Promise<ExportIO["pandoc"]> {
	if (!Platform.isDesktopApp || !(adapter instanceof FileSystemAdapter)) {
		return null;
	}
	// Loaded here, not at the top: mobile has no child_process.
	const { execFile } = require("child_process") as typeof import("child_process");
	const run = (args: string[], input = "") =>
		new Promise<void>((resolve, reject) => {
			const child = execFile("pandoc", args, { cwd: adapter.getBasePath() }, (error, _stdout, stderr) => {
				if (error) {
					reject(new Error(String(stderr).trim() || error.message));
					return;
				}
				resolve();
			});
			child.stdin?.end(input);
		});
	try {
		await run(["--version"]);
	} catch {
		return null;
	}
	return run;
}

function backupsFromVault(vault: Vault): BackupFiles {
	const adapter = vault.adapter;
	return {
		exists: (path) => adapter.exists(path),
		mkdir: (path) => adapter.mkdir(path),
		read: (path) => adapter.read(path),
		write: (path, data) => adapter.write(path, data),
		list: async (folder) => (await adapter.list(folder)).files,
		remove: (path) => adapter.remove(path),
	};
}

/** Last seen facts per memory note and stale chapters per project; hidden, so Obsidian does not index it. */
const PROPAGATION_PATH = ".atlas/propagacion.json";

/** Characters of context sent with a co-write request. */
const COWRITE_BUDGET = 8000;

export default class AtlasPlugin extends Plugin {
	settings: ProviderSettings = { ...DEFAULT_PROVIDER_SETTINGS };
	/** Co-write decisions for this session only. */
	private readonly coWrite = new CoWriteSession();

	async onload(): Promise<void> {
		const stored = (await this.loadData()) as Partial<ProviderSettings> | null;
		this.settings = {
			...DEFAULT_PROVIDER_SETTINGS,
			...stored,
			allowedHosts: stored?.allowedHosts ?? [],
		};
		this.addSettingTab(new AtlasSettingTab(this.app, this));
		this.registerView(MARKER_VIEW, (leaf) => new MarkerView(leaf));
		this.registerView(GRAPH_VIEW, (leaf) => new GraphView(leaf));
		this.registerView(ENTITY_VIEW, (leaf) => new EntityView(leaf));
		this.registerView(FORESHADOW_VIEW, (leaf) => new ForeshadowView(leaf));
		this.registerView(PEEK_VIEW, (leaf) => new PeekView(leaf));
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
			id: "show-relation-graph",
			name: "Grafo de relaciones",
			callback: () => {
				void this.openGraph();
			},
		});
		this.addCommand({
			id: "scan-entities",
			name: "Índice de entidades (escanear manuscrito)",
			callback: () => {
				void this.openEntities();
			},
		});
		this.addCommand({
			id: "show-entity-peek",
			name: "Vistazo de entidad (panel lateral)",
			callback: () => {
				void this.openPeek();
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
			id: "check-chronology",
			name: "Revisar cronología",
			callback: () => {
				void this.checkChronology();
			},
		});
		this.addCommand({
			id: "new-object",
			name: "Nuevo objeto",
			editorCallback: (editor) => {
				void this.newObject(editor.getSelection().trim());
			},
		});
		this.addCommand({
			id: "new-clue",
			name: "Nueva pista (foreshadowing)",
			editorCallback: (editor) => {
				void this.newClue(editor.getSelection().trim());
			},
		});
		this.addCommand({
			id: "advance-clue",
			name: "Avanzar pista (sembrado → reforzado → resuelto)",
			callback: () => {
				void this.advanceClue();
			},
		});
		this.addCommand({
			id: "show-foreshadow",
			name: "Tablero de foreshadowing",
			callback: () => {
				void this.openForeshadow();
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
			id: "new-memory",
			name: "Nueva memoria del capítulo",
			callback: () => {
				void this.newMemory();
			},
		});
		this.addCommand({
			id: "what-knows",
			name: "Qué sabe en este capítulo",
			editorCallback: (editor) => {
				void this.whatKnowsHere(editor.getSelection().trim() || READER);
			},
		});
		this.addCommand({
			id: "check-continuity",
			name: "Revisar continuidad",
			callback: () => {
				void this.checkContinuityHere();
			},
		});
		this.addCommand({
			id: "fact-dependents",
			name: "Quién depende de este hecho",
			editorCallback: (editor) => {
				void this.factDependentsHere(editor.getSelection().trim());
			},
		});
		this.addCommand({
			id: "dump-fact-graph",
			name: "Copiar grafo de dependencias (JSON)",
			callback: () => {
				void this.dumpFactGraph();
			},
		});
		this.addCommand({
			id: "propagate-changes",
			name: "Propagar cambios",
			callback: () => {
				void this.propagateChanges();
			},
		});
		this.addCommand({
			id: "stale-chapters",
			name: "Capítulos desactualizados",
			callback: () => {
				void this.showStale();
			},
		});
		this.addCommand({
			id: "lint-note",
			name: "Revisar estilo de la nota",
			editorCallback: (editor) => {
				void this.lintNote(editor);
			},
		});
		this.addCommand({
			id: "review-scene-ai",
			name: "Revisar escena con IA",
			editorCallback: (editor) => {
				this.reviewWithAi(editor).catch((error: unknown) => {
					new Notice(`La revisión con IA falló: ${error instanceof Error ? error.message : String(error)}`, 0);
				});
			},
		});
		this.addCommand({
			id: "co-write-scene",
			name: "Co-escribir escena",
			editorCallback: (editor) => {
				const path = this.app.workspace.getActiveFile()?.path;
				if (!path) {
					new Notice("Abre la escena que quieres co-escribir.");
					return;
				}
				new CoWriteModal(
					this.app,
					editor,
					this.coWrite,
					(modo, actual) => this.coWriteProposal(modo, actual),
					async (actual) => {
						await backup(backupsFromVault(this.app.vault), path, actual);
					},
				).open();
			},
		});
		this.addCommand({
			id: "restore-backup",
			name: "Restaurar respaldo de la nota",
			editorCallback: (editor) => {
				this.restoreBackup(editor).catch((error: unknown) => {
					new Notice(`No se pudo restaurar: ${error instanceof Error ? error.message : String(error)}`, 0);
				});
			},
		});
		this.addCommand({
			id: "export-manuscript",
			name: "Exportar manuscrito",
			callback: () => {
				void this.exportFromIndex();
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

	private async exportFromIndex(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		const order = file ? sceneOrder(await this.app.vault.read(file)) : null;
		if (!file || !order) {
			new Notice("Abre la nota índice del proyecto (frontmatter longform).");
			return;
		}
		if (order.escenas.length === 0) {
			new Notice("El índice no tiene escenas en longform.scenes.");
			return;
		}
		const { adapter } = this.app.vault;
		const pandoc = await findPandoc(adapter);
		const start = childPath(parentPath(file.path), "Exportar");
		new ExportModal(this.app, pandoc !== null, start, (format, folder) => {
			void (async () => {
				try {
					const { escenas, faltan } = await manuscriptScenes(file.path, order, (path) => adapter.read(path));
					if (escenas.length > 0 && folder.length > 0 && !(await adapter.exists(folder))) {
						await this.app.vault.createFolder(folder);
					}
					const io: ExportIO = {
						writeBinary: (path, data) => adapter.writeBinary(path, data.slice().buffer),
						pandoc,
					};
					const result = await exportManuscript(format, order.titulo || file.basename, escenas, folder, io);
					new Notice(exportMessage(result, faltan), 0);
				} catch (error) {
					new Notice(`No se pudo exportar: ${error instanceof Error ? error.message : String(error)}`, 0);
				}
			})();
		}).open();
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

	private async checkChronology(): Promise<void> {
		const notes = await Promise.all(
			this.app.vault
				.getMarkdownFiles()
				.map(async (file) => ({ path: file.path, nombre: file.basename, note: await this.app.vault.read(file) })),
		);
		const { scenes, travels } = readChronology(notes);
		const found = impossibleTravels(scenes, travels);
		new Notice(chronologyNotice(found), found.length === 0 ? undefined : 0);
	}

	private async newObject(name: string): Promise<void> {
		if (name.length === 0) {
			new Notice("Selecciona el nombre del objeto.");
			return;
		}
		if (name.includes("/") || name.includes("\\")) {
			new Notice("El nombre no puede incluir carpetas.");
			return;
		}
		const active = this.app.workspace.getActiveFile();
		const folder = objectFolder(active?.path ?? "");
		const path = `${folder}/${name}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Ese objeto ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, objectNote(name));
		new Notice("Objeto creado.");
	}

	private async newClue(name: string): Promise<void> {
		if (name.length === 0) {
			new Notice("Selecciona el nombre de la pista.");
			return;
		}
		if (name.includes("/") || name.includes("\\")) {
			new Notice("El nombre no puede incluir carpetas.");
			return;
		}
		const folder = clueFolder(this.app.workspace.getActiveFile()?.path ?? "");
		const path = `${folder}/${name}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Esa pista ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, clueNote(name));
		new Notice("Pista sembrada.");
	}

	private async advanceClue(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			new Notice("Abre una pista (tipo: pista).");
			return;
		}
		let next = "";
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
				if (frontmatter.tipo !== "pista") {
					return;
				}
				next = nextState(String(frontmatter.estado ?? ""));
				frontmatter.estado = next;
			});
		} catch {
			new Notice("El frontmatter de la pista no es YAML válido.");
			return;
		}
		new Notice(next.length > 0 ? `Pista: ${next}.` : "Abre una pista (tipo: pista).");
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

	private async newMemory(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const chapter = chapterNumber(active?.path ?? "");
		if (!active || chapter === null) {
			new Notice("Abre un capítulo (Cap NN).");
			return;
		}
		const folder = memoryFolder(active.path);
		const path = `${folder}/${memoryNoteName(chapter)}.md`;
		if (await this.app.vault.adapter.exists(path)) {
			new Notice("Esa memoria ya existe.");
			return;
		}
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		await this.app.vault.create(path, memoryNote(chapter));
		new Notice("Memoria creada.");
	}

	private async chapterMemories(): Promise<{ chapter: number; memories: ChapterMemory[] } | null> {
		const active = this.app.workspace.getActiveFile();
		const chapter = chapterNumber(active?.path ?? "");
		if (!active || chapter === null) {
			new Notice("Abre un capítulo (Cap NN).");
			return null;
		}
		return { chapter, memories: await this.memoriesBeside(active.path) };
	}

	/** Every `_Memoria/` note of the project holding `activePath`; no chapter needed. */
	private async projectMemories(): Promise<ChapterMemory[] | null> {
		const active = this.app.workspace.getActiveFile();
		if (!active) {
			new Notice("Abre una nota del proyecto.");
			return null;
		}
		const folder = projectMemoryFolder(active.path);
		const memories = await this.memoriesIn(folder);
		if (memories.length === 0) {
			new Notice(`No hay memorias en ${folder}/: el grafo estaría vacío.`);
			return null;
		}
		return memories;
	}

	private async memoriesBeside(activePath: string): Promise<ChapterMemory[]> {
		return this.memoriesIn(memoryFolder(activePath));
	}

	private async memoriesIn(memoryDir: string): Promise<ChapterMemory[]> {
		const folder = `${memoryDir}/`;
		const notes = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(folder));
		return Promise.all(notes.map(async (file) => parseMemory(await this.app.vault.cachedRead(file))));
	}

	private async checkContinuityHere(): Promise<void> {
		const found = await this.chapterMemories();
		if (!found) {
			return;
		}
		const errors = usageErrors(found.memories, found.chapter);
		const lines = [...errors, ...checkContinuity(found.memories, found.chapter).map((alert) => alert.mensaje)];
		const summary = lines.length > 0 ? lines.join("\n") : "Sin alertas.";
		new Notice(`Continuidad cap. ${found.chapter}\n${summary}`);
	}

	private async factDependentsHere(fact: string): Promise<void> {
		if (fact.length === 0) {
			new Notice("Selecciona el id de un hecho.");
			return;
		}
		const memories = await this.projectMemories();
		if (!memories) {
			return;
		}
		const graph = buildFactGraph(memories);
		const chapters = dependents(graph, fact);
		const summary = chapters.length > 0 ? chapters.map((chapter) => `Cap. ${chapter}`).join(", ") : "Ningún capítulo lo usa.";
		const warnings = graph.avisos.length > 0 ? `\nGrafo incompleto:\n${graph.avisos.join("\n")}` : "";
		new Notice(`Dependen de «${fact}»: ${summary}${warnings}`);
	}

	private async dumpFactGraph(): Promise<void> {
		const memories = await this.projectMemories();
		if (!memories) {
			return;
		}
		const graph = buildFactGraph(memories);
		await navigator.clipboard.writeText(graphDump(graph));
		const warnings = graph.avisos.length > 0 ? ` · ${graph.avisos.length} avisos de grafo incompleto` : "";
		new Notice(`Grafo copiado: ${graph.edges.length} aristas${warnings}.`);
	}

	/** Diffs the active chapter's facts against the last run and flags the later chapters that relied on them. */
	private async propagateChanges(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const chapter = chapterNumber(active?.path ?? "");
		if (!active || chapter === null) {
			new Notice("Abre un capítulo (Cap NN) o su memoria.");
			return;
		}
		const folder = projectMemoryFolder(active.path);
		const notes = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${folder}/`));
		const read = await Promise.all(
			notes.map(async (file) => ({ path: file.path, memory: parseMemory(await this.app.vault.cachedRead(file)) })),
		);
		const edited = read.find((note) => note.memory.capitulo === chapter);
		if (!edited) {
			new Notice(`No hay memoria del cap. ${chapter} en ${folder}/.`);
			return;
		}
		const store = await this.readPropagation();
		const before = store.base[edited.path];
		const changes = before ? factChanges(before, edited.memory.hechos) : [];
		const stale = staleFrom(buildFactGraph(read.map((note) => note.memory)), chapter, changes);
		store.stale[folder] = mergeStale(store.stale[folder] ?? [], stale);
		for (const note of read) {
			if (note === edited || !store.base[note.path]) {
				store.base[note.path] = note.memory.hechos;
			}
		}
		await this.writePropagation(store);
		if (!before) {
			new Notice(`Base guardada para el cap. ${chapter}: el próximo «Propagar cambios» comparará sus hechos con esta.`);
			return;
		}
		const count = (kind: string) => changes.filter((change) => change.cambio === kind).length;
		new Notice(
			`Cap. ${chapter}: ${count("añadido")} añadidos, ${count("eliminado")} eliminados, ${count("cambiado")} cambiados · ${stale.length} capítulos desactualizados.`,
		);
		if (stale.length > 0) {
			this.openStale(folder, store.stale[folder] ?? []);
		}
	}

	private async showStale(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		if (!active) {
			new Notice("Abre una nota del proyecto.");
			return;
		}
		const folder = projectMemoryFolder(active.path);
		this.openStale(folder, (await this.readPropagation()).stale[folder] ?? []);
	}

	private openStale(folder: string, list: StaleChapter[]): void {
		const root = folder.slice(0, folder.length - "_Memoria".length);
		new StaleModal(
			this.app,
			list,
			async (chapter) => {
				const store = await this.readPropagation();
				store.stale[folder] = confirmReanalysis(store.stale[folder] ?? [], chapter);
				await this.writePropagation(store);
				return store.stale[folder];
			},
			(chapter) => {
				const files = this.app.vault.getMarkdownFiles().filter((file) => chapterNumber(file.path) === chapter);
				const file =
					files.find((candidate) => candidate.path.startsWith(`${root}Manuscrito/`)) ??
					files.find((candidate) => candidate.path.startsWith(`${folder}/`));
				if (file) {
					void this.app.workspace.getLeaf(false).openFile(file);
				} else {
					new Notice(`No encuentro el cap. ${chapter} en el proyecto.`);
				}
			},
		).open();
	}

	private async readPropagation(): Promise<PropagationStore> {
		const adapter = this.app.vault.adapter;
		return parseStore((await adapter.exists(PROPAGATION_PATH)) ? await adapter.read(PROPAGATION_PATH) : null);
	}

	private async writePropagation(store: PropagationStore): Promise<void> {
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(".atlas"))) {
			await adapter.mkdir(".atlas");
		}
		await adapter.write(PROPAGATION_PATH, JSON.stringify(store, null, 2));
	}

	private async whatKnowsHere(who: string): Promise<void> {
		const found = await this.chapterMemories();
		if (!found) {
			return;
		}
		const { chapter, memories } = found;
		const errors = memories.flatMap(knowledgeErrors);
		const known = whatKnows(memories, who, chapter);
		const lines = known.map((fact) => `${fact.estado}: ${fact.texto}`);
		const summary = lines.length > 0 ? lines.join("\n") : "Nada registrado.";
		new Notice(`${who} en cap. ${chapter}\n${summary}${errors.length > 0 ? `\n${errors.join("\n")}` : ""}`);
	}

	private async lintNote(editor: Editor): Promise<void> {
		const folder = skillFolder(this.app.workspace.getActiveFile()?.path ?? "");
		const notes = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${folder}/`));
		const skills = await Promise.all(notes.map(async (file) => parseSkill(await this.app.vault.read(file))));
		new LintModal(this.app, editor, [...BASE_RULES, ...patternRules(skillsFor(skills, "global"))]).open();
	}

	private async reviewWithAi(editor: Editor): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		const path = active?.path ?? "";
		const chapter = chapterOf(path);
		if (!active || chapter === null) {
			new Notice("Abre una escena de un capítulo (Cap NN).");
			return;
		}
		if (!providerReady(this.settings)) {
			new Notice(NO_PROVIDER, 0);
			return;
		}
		// Read-only: the project's notes are read, none is written.
		const root = projectOf(path);
		const files = this.app.vault.getMarkdownFiles().filter((file) => inProject(root, file.path));
		const notes = await Promise.all(files.map(async (file) => this.app.vault.cachedRead(file)));
		const byType = (tipo: string) => notes.filter((note) => scalar(frontmatterBody(note), "tipo") === tipo);
		new Notice("Revisando la escena con IA…");
		const result = await reviewScene(
			{
				capitulo: chapter,
				escena: editor.getValue(),
				skills: byType("skill").map(parseSkill),
				personajes: byType("personaje").map(parseCharacter),
				objetos: byType("objeto").map(parseObject),
				lugares: byType("lugar").map(parsePlace),
				memorias: byType("memoria").map(parseMemory),
				resumenes: [],
				trama: "",
				presupuesto: 12_000,
			},
			this.settings,
			ollamaProvider(this.settings, async (url, body) =>
				(await requestUrl({ url, method: "POST", contentType: "application/json", body: JSON.stringify(body) })).json,
			),
		);
		if (!result.ok) {
			new Notice(result.mensaje, 0);
			return;
		}
		new ReviewModal(this.app, editor, result.hallazgos, result.descartados, result.escenaRecortada).open();
	}

	private async restoreBackup(editor: Editor): Promise<void> {
		const path = this.app.workspace.getActiveFile()?.path;
		if (!path) {
			new Notice("Abre la nota que quieres restaurar.");
			return;
		}
		const files = backupsFromVault(this.app.vault);
		const versions = await listBackups(files, path);
		if (versions.length === 0) {
			new Notice("Esta nota no tiene respaldos.");
			return;
		}
		new RestoreModal(this.app, versions, (version) => {
			restore(files, path, version.path, editor.getValue())
				.then((text) => {
					editor.setValue(text);
					new Notice("Versión restaurada. El texto anterior quedó respaldado.");
				})
				.catch((error: unknown) => {
					new Notice(`No se pudo restaurar: ${error instanceof Error ? error.message : String(error)}`, 0);
				});
		}).open();
	}

	private async coWriteProposal(modo: CoWriteMode, actual: string) {
		const path = this.app.workspace.getActiveFile()?.path ?? "";
		const read = async <T>(folder: string, parse: (note: string) => T): Promise<T[]> => {
			const notes = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${folder}/`));
			return Promise.all(notes.map(async (file) => parse(await this.app.vault.cachedRead(file))));
		};
		const contexto = coWriteContext({
			capitulo: chapterNumber(path) ?? 0,
			escena: actual,
			skills: await read(skillFolder(path), parseSkill),
			personajes: await read(characterFolder(path), parseCharacter),
			objetos: await read(objectFolder(path), parseObject),
			lugares: await read(placeFolder(path), parsePlace),
			memorias: await read(memoryFolder(path), parseMemory),
			resumenes: [],
			trama: "",
			presupuesto: COWRITE_BUDGET,
		});
		const post = async (url: string, body: unknown) =>
			(await requestUrl({ url, method: "POST", contentType: "application/json", body: JSON.stringify(body) })).json;
		return propose(ollamaProvider(this.settings, post), modo, actual, contexto);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async openGraph(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(GRAPH_VIEW);
		const leaf = existing[0] ?? this.app.workspace.getLeaf(true);
		if (existing.length === 0) {
			// `setViewState` opens the view, and `onOpen` already refreshes it.
			await leaf.setViewState({ type: GRAPH_VIEW, active: true });
		} else if (leaf.view instanceof GraphView) {
			await leaf.view.refresh();
		}
		await this.app.workspace.revealLeaf(leaf);
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

	private async openForeshadow(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(FORESHADOW_VIEW);
		const leaf = existing[0] ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}
		if (existing.length === 0) {
			await leaf.setViewState({ type: FORESHADOW_VIEW, active: false });
		}
		await this.app.workspace.revealLeaf(leaf);
		if (leaf.view instanceof ForeshadowView) {
			await leaf.view.refresh();
		}
	}

	private async openPeek(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(PEEK_VIEW);
		const leaf = existing[0] ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}
		if (existing.length === 0) {
			// `active: false` keeps the editor focused, so the cursor stays on the scene.
			await leaf.setViewState({ type: PEEK_VIEW, active: false });
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	private async openEntities(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(ENTITY_VIEW);
		const leaf = existing[0] ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			return;
		}
		if (existing.length === 0) {
			await leaf.setViewState({ type: ENTITY_VIEW, active: false });
		}
		await this.app.workspace.revealLeaf(leaf);
		if (leaf.view instanceof EntityView) {
			await leaf.view.refresh();
		}
	}
}
