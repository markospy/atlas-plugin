import assert from "node:assert/strict";
import test from "node:test";

import esbuild from "esbuild";

// #22 QA v2 (Reviewer R1): the real "Registro de decisiones" command wired to an in-memory vault.
// decisions.test.mjs covers the library; this checks the modal and `.atlas/decisiones.json`.

const STORE = ".atlas/decisiones.json";
const ACTIVE = "Novela/Manuscrito/Cap 09.md";
const SCENES = {
	"Novela/Manuscrito/Cap 02.md": "Llegaron a la posada del Ciervo al anochecer.",
	"Novela/Manuscrito/Cap 04.md": "Nadie habló en la Posada del Ciervo.",
	"Novela/Manuscrito/Cap 05.md": "El camino seguía.",
	"Novela/Manuscrito/Cap 07.md": "La posada del Ciervo ya no existía.",
	"Novela/Manuscrito/Cap 09.md": "Entraron en El Reyezuelo.",
	"Otra/Manuscrito/Cap 01.md": "La posada del Ciervo de otra novela.",
};
const SETTINGS = { endpoint: "http://127.0.0.1:11434", cloudOptIn: false, allowedHosts: [], model: "llama3.2" };

function node(tag = "div", options = {}) {
	return {
		tag,
		text: options.text ?? "",
		type: options.type,
		placeholder: options.placeholder,
		value: "",
		children: [],
		listeners: {},
		createEl(childTag, childOptions = {}) {
			const child = node(childTag, childOptions);
			this.children.push(child);
			return child;
		},
		createDiv(childOptions = {}) {
			return this.createEl("div", childOptions);
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
const buttons = (el, label) => findAll(el, (child) => child.tag === "button" && child.text === label);
const inputs = (el) => findAll(el, (child) => child.tag === "input");
const items = (el) => findAll(el, (child) => child.tag === "li").map((li) => li.text.trim());
const texts = (el) => findAll(el, (child) => child.text.length > 0).map((child) => child.text);
const settle = async () => {
	for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
};

function memoryAdapter() {
	const files = new Map();
	const folders = new Set();
	return {
		files,
		folders,
		exists: async (path) => files.has(path) || folders.has(path),
		mkdir: async (path) => {
			folders.add(path);
		},
		read: async (path) => files.get(path),
		write: async (path, data) => {
			files.set(path, data);
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
		TFile: state.TFile,
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
		requestUrl: async () => ({ json: { response: "" } }),
	};
}

let bundle;
async function loadPlugin(state) {
	bundle ??= (
		await esbuild.build({
			entryPoints: ["src/main.ts"],
			bundle: true,
			external: ["obsidian"],
			format: "cjs",
			platform: "node",
			write: false,
		})
	).outputFiles[0].text;
	const module = { exports: {} };
	const obsidian = stubObsidian(state);
	new Function("module", "exports", "require", bundle)(module, module.exports, (id) => {
		// The node build of `yaml` needs node builtins; the plugin bundle uses its browser build.
		if (id.startsWith("node:") || id === "process" || id === "buffer") {
			return process.getBuiltinModule(id);
		}
		assert.equal(id, "obsidian");
		return obsidian;
	});
	return module.exports.default;
}

async function setup(adapter = memoryAdapter()) {
	class TFile {
		constructor(path) {
			this.path = path;
		}
	}
	const state = { commands: {}, modals: [], notices: [], opened: [], TFile };
	const files = Object.keys(SCENES).map((path) => new TFile(path));
	const app = {
		vault: {
			adapter,
			getMarkdownFiles: () => files,
			cachedRead: async (file) => SCENES[file.path],
			getAbstractFileByPath: (path) => files.find((file) => file.path === path) ?? null,
			on: () => ({}),
		},
		workspace: {
			getActiveFile: () => ({ path: ACTIVE }),
			getLeaf: () => ({ openFile: async (file) => state.opened.push(file.path) }),
		},
	};
	const AtlasPlugin = await loadPlugin(state);
	const plugin = new AtlasPlugin(app, {});
	await plugin.onload();
	return { state, adapter };
}

async function openLog(state) {
	state.commands["decision-log"].callback();
	await settle();
	return state.modals.at(-1);
}

async function register(modal, antiguo, nuevo, desde) {
	const [a, n, d] = inputs(modal.contentEl);
	a.value = antiguo;
	n.value = nuevo;
	d.value = desde;
	buttons(modal.contentEl, "Registrar decisión")[0].listeners.click();
	await settle();
}

const stored = (adapter) => JSON.parse(adapter.files.get(STORE));

test("runtime: Registrar decisión guarda d1 en .atlas/decisiones.json y lista cap. 2 y cap. 4", async () => {
	const { state, adapter } = await setup();
	const modal = await openLog(state);
	assert.ok(texts(modal.contentEl).includes("Aún no hay decisiones."));
	await register(modal, "posada del Ciervo", "El Reyezuelo", "7");
	assert.ok(adapter.folders.has(".atlas"));
	assert.deepEqual(stored(adapter), {
		decisiones: {
			Novela: [{ id: "d1", antiguo: "posada del Ciervo", nuevo: "El Reyezuelo", desde: 7, alineados: [] }],
		},
	});
	assert.ok(texts(modal.contentEl).includes("«posada del Ciervo» → «El Reyezuelo» desde el cap. 7"));
	assert.deepEqual(items(modal.contentEl), ["Cap. 2 · 1 escena(s)", "Cap. 4 · 1 escena(s)"]);
	assert.deepEqual(state.notices, []);
});

test("runtime: Marcar alineado guarda alineados [2] y quita el cap. 2; Abrir abre la escena", async () => {
	const { state, adapter } = await setup();
	const modal = await openLog(state);
	await register(modal, "posada del Ciervo", "El Reyezuelo", "7");
	buttons(modal.contentEl, "Marcar alineado")[0].listeners.click();
	await settle();
	assert.deepEqual(stored(adapter).decisiones.Novela[0].alineados, [2]);
	assert.deepEqual(items(modal.contentEl), ["Cap. 4 · 1 escena(s)"]);
	buttons(modal.contentEl, "Abrir")[0].listeners.click();
	await settle();
	assert.deepEqual(state.opened, ["Novela/Manuscrito/Cap 04.md"]);
	assert.equal(modal.closed, true);
});

test("runtime: reabrir el comando lee el almacén y muestra lo mismo", async () => {
	const adapter = memoryAdapter();
	const first = await setup(adapter);
	const modal = await openLog(first.state);
	await register(modal, "posada del Ciervo", "El Reyezuelo", "7");
	buttons(modal.contentEl, "Marcar alineado")[0].listeners.click();
	await settle();
	// A fresh plugin over the same vault, as after restarting Obsidian.
	const second = await setup(adapter);
	const reopened = await openLog(second.state);
	assert.ok(texts(reopened.contentEl).includes("«posada del Ciervo» → «El Reyezuelo» desde el cap. 7"));
	assert.deepEqual(items(reopened.contentEl), ["Cap. 4 · 1 escena(s)"]);
});

for (const [name, antiguo, nuevo, desde, notice] of [
	["corte 0", "posada del Ciervo", "El Reyezuelo", "0", "El capítulo de corte debe ser un número entero mayor que 0."],
	["corte vacío", "posada del Ciervo", "El Reyezuelo", "", "El capítulo de corte debe ser un número entero mayor que 0."],
	["valor antiguo vacío", "  ", "El Reyezuelo", "7", "Falta el valor antiguo."],
	["valor nuevo vacío", "posada del Ciervo", "", "7", "Falta el valor nuevo."],
]) {
	test(`runtime: ${name} avisa con Notice y no escribe nada`, async () => {
		const { state, adapter } = await setup();
		const modal = await openLog(state);
		await register(modal, antiguo, nuevo, desde);
		assert.deepEqual(state.notices, [notice]);
		assert.equal(adapter.files.has(STORE), false);
		assert.ok(texts(modal.contentEl).includes("Aún no hay decisiones."));
	});
}
