import assert from "node:assert/strict";
import test from "node:test";

import esbuild from "esbuild";

// #28 QA: the real plugin commands wired to a vault adapter. backup.test.mjs covers the
// library; this checks that "Co-escribir escena" and "Restaurar respaldo de la nota" use it.

const SCENE_PATH = "Novela/Manuscrito/Cap 01/Escena 1.md";
const FOLDER = ".atlas/respaldos/Novela/Manuscrito/Cap 01/Escena 1";
const SCENE = "Elena abrió la puerta.\nLa casa estaba fría.";
const SETTINGS = { endpoint: "http://127.0.0.1:11434", cloudOptIn: false, allowedHosts: [], model: "llama3.2" };

function node(tag = "div", text = "") {
	return {
		tag,
		text,
		children: [],
		listeners: {},
		createEl(childTag, options = {}) {
			const child = node(childTag, options.text ?? "");
			this.children.push(child);
			return child;
		},
		empty() {
			this.children = [];
		},
		addEventListener(event, handler) {
			this.listeners[event] = handler;
		},
	};
}
const findAll = (el, match) => el.children.flatMap((child) => [...(match(child) ? [child] : []), ...findAll(child, match)]);
const button = (el, label) => findAll(el, (child) => child.tag === "button" && child.text === label)[0];
const settle = async () => {
	for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
};

/** Obsidian's `DataAdapter`, in memory: `list` returns vault-relative paths, as Obsidian does. */
function memoryAdapter() {
	const files = new Map();
	const folders = new Set();
	return {
		files,
		exists: async (path) => files.has(path) || folders.has(path) || [...files.keys()].some((file) => file.startsWith(`${path}/`)),
		mkdir: async (path) => {
			folders.add(path);
		},
		read: async (path) => files.get(path),
		write: async (path, data) => {
			files.set(path, data);
		},
		list: async (folder) => ({
			files: [...files.keys()].filter((path) => path.startsWith(`${folder}/`) && !path.slice(folder.length + 1).includes("/")),
			folders: [],
		}),
		remove: async (path) => {
			files.delete(path);
		},
	};
}

function stubObsidian(state) {
	class Base {
		constructor(app) {
			this.app = app;
			this.contentEl = node();
		}
	}
	return {
		Plugin: class extends Base {
			async loadData() {
				return SETTINGS;
			}
			addSettingTab() {}
			registerView() {}
			registerEvent() {}
			addCommand(command) {
				state.commands[command.id] = command;
			}
		},
		PluginSettingTab: class extends Base {},
		ItemView: class extends Base {},
		MarkdownView: class extends Base {},
		Setting: class {},
		FuzzySuggestModal: class extends Base {
			setPlaceholder() {}
			open() {
				state.modals.push(this);
			}
		},
		TFile: class {},
		Modal: class extends Base {
			open() {
				state.modals.push(this);
				this.onOpen();
			}
			close() {
				this.closed = true;
			}
		},
		Notice: class {
			constructor(message) {
				state.notices.push(message);
			}
		},
		requestUrl: async () => ({ json: { response: state.reply } }),
	};
}

async function loadPlugin(state) {
	const built = await esbuild.build({
		entryPoints: ["src/main.ts"],
		bundle: true,
		external: ["obsidian"],
		format: "cjs",
		platform: "node",
		write: false,
	});
	const module = { exports: {} };
	const obsidian = stubObsidian(state);
	new Function("module", "exports", "require", built.outputFiles[0].text)(module, module.exports, (id) => {
		// The node build of `yaml` needs node builtins; the plugin bundle uses its browser build.
		if (id.startsWith("node:") || id === "process" || id === "buffer") {
			return process.getBuiltinModule(id);
		}
		assert.equal(id, "obsidian");
		return obsidian;
	});
	return module.exports.default;
}

async function setup({ active = SCENE_PATH } = {}) {
	const state = { commands: {}, modals: [], notices: [], reply: "Otra escena." };
	const adapter = memoryAdapter();
	const app = {
		vault: { adapter, getMarkdownFiles: () => [], cachedRead: async () => "", on: () => ({}) },
		workspace: { getActiveFile: () => (active ? { path: active } : null) },
	};
	let value = SCENE;
	const editor = {
		getValue: () => value,
		setValue: (next) => {
			value = next;
		},
	};
	const AtlasPlugin = await loadPlugin(state);
	const plugin = new AtlasPlugin(app, {});
	await plugin.onload();
	return { state, adapter, editor, value: () => value };
}

test("runtime: Co-escribir + Aprobar deja en .atlas/respaldos el texto de antes", async () => {
	const { state, adapter, editor, value } = await setup();
	state.commands["co-write-scene"].editorCallback(editor);
	const [modal] = state.modals;
	button(modal.contentEl, "Alternativa").listeners.click();
	await settle();
	button(modal.contentEl, "Aprobar").listeners.click();
	await settle();
	assert.equal(value(), "Otra escena.");
	const saved = [...adapter.files.keys()];
	assert.equal(saved.length, 1);
	assert.match(saved[0], new RegExp(`^${FOLDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}\\.\\d{3}Z\\.md$`));
	assert.equal(adapter.files.get(saved[0]), SCENE);
});

test("runtime: Restaurar respaldo devuelve la versión elegida y respalda el texto sustituido", async () => {
	const { state, adapter, editor, value } = await setup();
	adapter.files.set(`${FOLDER}/2026-11-15T08-00-00.000Z.md`, "versión 1");
	adapter.files.set(`${FOLDER}/2026-11-15T09-00-00.000Z.md`, "versión 2");
	state.commands["restore-backup"].editorCallback(editor);
	await settle();
	const [modal] = state.modals;
	const items = modal.getItems();
	assert.deepEqual(
		items.map((item) => item.path),
		[`${FOLDER}/2026-11-15T09-00-00.000Z.md`, `${FOLDER}/2026-11-15T08-00-00.000Z.md`],
	);
	modal.onChooseItem(items[1]);
	await settle();
	assert.equal(value(), "versión 1");
	const added = [...adapter.files.keys()].filter((path) => !path.includes("2026-11-15T0"));
	assert.equal(added.length, 1);
	assert.equal(adapter.files.get(added[0]), SCENE);
	assert.match(state.notices.at(-1), /restaurada/);
});

test("runtime: Restaurar en una nota sin respaldos avisa y no abre la lista", async () => {
	const { state, editor, value } = await setup();
	state.commands["restore-backup"].editorCallback(editor);
	await settle();
	assert.equal(state.modals.length, 0);
	assert.deepEqual(state.notices, ["Esta nota no tiene respaldos."]);
	assert.equal(value(), SCENE);
});

test("runtime: sin nota activa, Co-escribir avisa y no abre el diff", async () => {
	const { state, adapter, editor } = await setup({ active: null });
	state.commands["co-write-scene"].editorCallback(editor);
	assert.equal(state.modals.length, 0);
	assert.match(state.notices[0], /Abre la escena/);
	assert.equal(adapter.files.size, 0);
});
