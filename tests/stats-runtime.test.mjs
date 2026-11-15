import assert from "node:assert/strict";
import test from "node:test";

import esbuild from "esbuild";

import { dayKey } from "../src/stats.ts";

// #25 QA: the real command, settings load/save and modify event of `src/main.ts`, run with a stub
// Obsidian. The unit tests cover the math; these cover what the writer sees and what data.json keeps.

const NOTES = {
	"Novela/Manuscrito/Cap 01.md": "---\ntipo: escena\n---\nUno dos tres.\n",
	"Novela/Manuscrito/Cap 02.md": "Cuatro cinco.",
	"Novela/Personajes/Ana.md": "No cuenta nada aquí.",
	"Otra/Manuscrito/Cap 01.md": "Tampoco cuenta.",
};

function stubObsidian(state) {
	class Base {
		constructor(app) {
			this.app = app;
		}
	}
	class TFile {
		constructor(path) {
			this.path = path;
			this.basename = path.split("/").pop().replace(/\.md$/, "");
		}
	}
	return {
		Plugin: class extends Base {
			addCommand(command) {
				state.commands[command.id] = command;
			}
			addSettingTab() {}
			registerView() {}
			registerEvent() {}
			async loadData() {
				return state.stored;
			}
			async saveData(data) {
				state.saved.push(structuredClone(data));
			}
		},
		PluginSettingTab: class extends Base {},
		ItemView: class extends Base {},
		MarkdownView: class extends Base {},
		Modal: class extends Base {},
		Setting: class {},
		TFile,
		Notice: class {
			constructor(message) {
				state.notices.push(message);
			}
		},
		requestUrl: async () => {
			throw new Error("sin red");
		},
	};
}

async function startPlugin(stored) {
	const state = { commands: {}, notices: [], saved: [], stored, timers: [], onModify: undefined };
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
	new Function("module", "exports", "require", built.outputFiles[0].text)(module, module.exports, () => obsidian);
	const files = Object.keys(NOTES).map((path) => new obsidian.TFile(path));
	globalThis.window = {
		setTimeout: (run, ms) => state.timers.push({ run, ms }),
		clearTimeout: () => {},
	};
	const app = {
		vault: {
			getMarkdownFiles: () => files,
			cachedRead: async (file) => NOTES[file.path],
			on: (event, handler) => {
				assert.equal(event, "modify");
				state.onModify = handler;
				return {};
			},
		},
		workspace: { getActiveFile: () => files[0] },
	};
	const plugin = new module.exports.default(app, {});
	await plugin.onload();
	return { state, files };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const today = dayKey(new Date());
const yesterday = dayKey(new Date(Date.now() - 864e5));

test("runtime: Progreso de escritura avisa total, meta por defecto y racha la primera vez", async () => {
	const { state } = await startPlugin(null);
	state.commands["writing-progress"].callback();
	await settle();
	assert.deepEqual(state.notices, ["Manuscrito: 5 palabras\nHoy: 0 / 500 (0 %)\nRacha: 0 días"]);
	assert.deepEqual(state.saved.at(-1).escritura, { Novela: { [today]: { inicio: 5, total: 5 } } });
	assert.equal(state.saved.at(-1).metaDiaria, 500);
});

test("runtime: la meta y el registro guardados se recargan y el día parte del total de ayer", async () => {
	const { state } = await startPlugin({ metaDiaria: 0, escritura: { Novela: { [yesterday]: { inicio: 0, total: 3 } } } });
	state.commands["writing-progress"].callback();
	await settle();
	assert.deepEqual(state.notices, ["Manuscrito: 5 palabras\nHoy: 2 (sin meta diaria)\nRacha: 2 días"]);
	const saved = state.saved.at(-1);
	assert.equal(saved.metaDiaria, 0);
	assert.deepEqual(saved.escritura.Novela[today], { inicio: 3, total: 5 });
});

test("runtime: guardar una escena recuenta a los 5 s; otras notas no programan nada", async () => {
	const { state, files } = await startPlugin(null);
	state.onModify(files[2]);
	state.onModify({ path: "Novela/Manuscrito/Cap 01.md" });
	assert.equal(state.timers.length, 0, "ni personajes ni objetos que no son TFile");
	state.onModify(files[1]);
	assert.deepEqual(state.timers.map((timer) => timer.ms), [5000]);
	state.timers[0].run();
	await settle();
	assert.deepEqual(state.saved.at(-1).escritura, { Novela: { [today]: { inicio: 5, total: 5 } } });
	assert.deepEqual(state.notices, []);

	const saves = state.saved.length;
	state.onModify(files[1]);
	state.timers[1].run();
	await settle();
	assert.equal(state.saved.length, saves, "sin cambio de total no reescribe data.json");
});
