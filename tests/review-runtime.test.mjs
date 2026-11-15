import assert from "node:assert/strict";
import test from "node:test";

import esbuild from "esbuild";

// R6: AC2 "no modifica archivos del manuscrito" checked by running the real command and modal,
// not by a regex over the source. Every vault, editor and file-manager call is recorded.

const SCENE_PATH = "Novela/Manuscrito/Cap 01/Escena 1.md";
const SCENE = "---\npov: Elena\n---\nElena entra.\n—No —dijo tristemente.\n";
const NOTES = {
	[SCENE_PATH]: SCENE,
	"Novela/Personajes/Elena.md": "---\ntipo: personaje\nnombre: Elena\n---\n",
	"Novela/Skills/Mostrar.md": "---\ntipo: skill\nnombre: Mostrar\n---\nMostrar, no contar.\n",
	"Otra/Personajes/Intruso.md": "---\ntipo: personaje\nnombre: Intruso\n---\n",
};
const REPLY = JSON.stringify([
	{ tipo: "estilo", cita: "tristemente", mensaje: "Muestra la tristeza." },
	{ tipo: "continuidad", cita: "no está en la escena", mensaje: "x" },
]);

/** Records every method called on the object, whatever its name; returns `impl[name]` or undefined. */
function recorder(log, label, impl = {}) {
	return new Proxy(impl, {
		get(target, name) {
			if (typeof name !== "string" || name === "then") {
				return undefined;
			}
			if (name in target && typeof target[name] !== "function") {
				return target[name];
			}
			return (...args) => {
				log.push([label, name, ...args]);
				return typeof target[name] === "function" ? target[name](...args) : undefined;
			};
		},
	});
}

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

function stubObsidian(state) {
	class Base {
		constructor(app) {
			this.app = app;
			this.contentEl = node();
		}
	}
	return {
		Plugin: class extends Base {},
		PluginSettingTab: class extends Base {},
		ItemView: class extends Base {},
		MarkdownView: class extends Base {},
		Setting: class {},
		FuzzySuggestModal: class extends Base {
			setPlaceholder() {}
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
		requestUrl: async (request) => {
			state.requests.push(request);
			return { json: { response: state.reply } };
		},
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
		assert.equal(id, "obsidian");
		return obsidian;
	});
	return module.exports.default;
}

async function runReview(settings) {
	const state = { modals: [], notices: [], requests: [], reply: REPLY };
	const calls = [];
	const files = Object.keys(NOTES).map((path) => ({ path, basename: path.split("/").pop().replace(/\.md$/, "") }));
	const vault = recorder(calls, "vault", {
		getMarkdownFiles: () => files,
		cachedRead: async (file) => NOTES[file.path],
		read: async (file) => NOTES[file.path],
	});
	const app = {
		vault,
		fileManager: recorder(calls, "fileManager"),
		workspace: recorder(calls, "workspace", { getActiveFile: () => files[0] }),
	};
	const editor = recorder(calls, "editor", { getValue: () => SCENE });
	const AtlasPlugin = await loadPlugin(state);
	const plugin = new AtlasPlugin(app, {});
	plugin.settings = settings;
	await plugin.reviewWithAi(editor);
	return { state, calls, editor };
}

const READS = new Set(["vault.getMarkdownFiles", "vault.cachedRead", "vault.read", "workspace.getActiveFile", "editor.getValue"]);
const SETTINGS = { endpoint: "http://127.0.0.1:11434", cloudOptIn: false, allowedHosts: [], model: "llama3.2" };

test("runtime: Revisar escena con IA con proveedor mock solo lee y abre los hallazgos", async () => {
	const { state, calls } = await runReview(SETTINGS);
	const used = calls.map(([label, name]) => `${label}.${name}`);
	assert.deepEqual(used.filter((call) => !READS.has(call)), [], "solo llamadas de lectura");
	assert.ok(!calls.some(([, name, file]) => name === "cachedRead" && file.path.startsWith("Otra/")), "no lee otro proyecto");
	assert.equal(state.requests.length, 1);
	assert.equal(state.requests[0].url, "http://127.0.0.1:11434/api/generate");
	assert.equal(state.modals.length, 1);
	const items = findAll(state.modals[0].contentEl, (child) => child.tag === "a").map((child) => child.text);
	assert.deepEqual(items, ["Línea 5 · estilo: Muestra la tristeza. «tristemente»"]);
});

test("runtime: el clic en un hallazgo solo mueve el cursor a la cita", async () => {
	const { state, calls } = await runReview(SETTINGS);
	calls.length = 0;
	const [link] = findAll(state.modals[0].contentEl, (child) => child.tag === "a");
	link.listeners.click({ preventDefault() {} });
	assert.deepEqual(calls, [["editor", "setCursor", { line: 4, ch: 10 }]]);
	assert.equal(state.modals[0].closed, true);
});

test("runtime: sin modelo avisa una vez, no llama al proveedor ni toca notas", async () => {
	const { state, calls } = await runReview({ ...SETTINGS, model: "" });
	assert.equal(state.requests.length, 0);
	assert.equal(state.modals.length, 0);
	assert.equal(state.notices.length, 1);
	assert.match(state.notices[0], /proveedor/);
	assert.deepEqual(calls.map(([label, name]) => `${label}.${name}`), ["workspace.getActiveFile"]);
});
