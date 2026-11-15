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

async function startPlugin(stored, active = 0, folders = []) {
	const state = { commands: {}, notices: [], saved: [], stored, timers: [], on: {}, onModify: undefined };
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
		setTimeout: (run, ms) => state.timers.push({ run, ms, cleared: false }),
		clearTimeout: (id) => {
			if (id !== undefined) {
				state.timers[id - 1].cleared = true;
			}
		},
	};
	const app = {
		vault: {
			getMarkdownFiles: () => files,
			cachedRead: async (file) => NOTES[file.path],
			getAbstractFileByPath: (path) =>
				folders.includes(path) || files.some((file) => file.path.startsWith(`${path}/`)) ? { path } : null,
			on: (event, handler) => {
				state.on[event] = handler;
				if (event === "modify") {
					state.onModify = handler;
				}
				return {};
			},
		},
		workspace: { getActiveFile: () => (typeof active === "number" ? files[active] : new obsidian.TFile(active)) },
	};
	const plugin = new module.exports.default(app, {});
	await plugin.onload();
	return { state, files, plugin };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const today = dayKey(new Date());
const now = new Date();
// Calendar day before, not 24 h before: on a DST change day `Date.now() - 864e5` can be today.
const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

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

test("runtime: guardar en dos proyectos en menos de 5 s recuenta los dos", async () => {
	const { state, files } = await startPlugin(null);
	state.onModify(files[1]);
	state.onModify(files[3]);
	state.onModify(files[1]);
	assert.deepEqual(state.timers.map((timer) => timer.cleared), [true, false, false], "solo se reprograma el de Novela");
	for (const timer of state.timers.filter((timer) => !timer.cleared)) {
		timer.run();
	}
	await settle();
	assert.deepEqual(state.saved.at(-1).escritura, {
		Novela: { [today]: { inicio: 5, total: 5 } },
		Otra: { [today]: { inicio: 2, total: 2 } },
	});
});

test("runtime: Progreso de escritura fuera de un proyecto no guarda un registro vacío", async () => {
	const { state } = await startPlugin(null, "Diario/hoy.md");
	state.commands["writing-progress"].callback();
	await settle();
	assert.deepEqual(state.notices, ["Abre una nota del proyecto."]);
	assert.deepEqual(state.saved, []);
});

test("runtime: descargar el plugin ejecuta los recuentos pendientes de todos los proyectos", async () => {
	const { state, files, plugin } = await startPlugin(null);
	state.onModify(files[1]);
	state.onModify(files[3]);
	plugin.onunload();
	await settle();
	assert.deepEqual(state.timers.map((timer) => timer.cleared), [true, true]);
	assert.deepEqual(state.saved.at(-1).escritura, {
		Novela: { [today]: { inicio: 5, total: 5 } },
		Otra: { [today]: { inicio: 2, total: 2 } },
	});
	state.onModify(files[1]);
	assert.deepEqual(state.timers.map((timer) => timer.cleared), [true, true, false], "tras onunload el Map queda vacío");
});

test("runtime: borrar una escena recuenta su proyecto a los 5 s", async () => {
	const { state, files } = await startPlugin({ escritura: { Novela: { [today]: { inicio: 5, total: 5 } } } });
	const [deleted] = files.splice(1, 1);
	state.on.delete(deleted);
	assert.deepEqual(state.timers.map((timer) => timer.ms), [5000]);
	state.timers[0].run();
	await settle();
	assert.deepEqual(state.saved.at(-1).escritura.Novela[today], { inicio: 5, total: 3 });
});

test("runtime: mover una escena recuenta el proyecto de origen y el de destino", async () => {
	const { state, files } = await startPlugin(null);
	state.on.rename(files[1], "Otra/Manuscrito/Cap 02.md");
	assert.equal(state.timers.length, 2, "un recuento para Otra y otro para Novela");
	for (const timer of state.timers) {
		timer.run();
	}
	await settle();
	assert.deepEqual(Object.keys(state.saved.at(-1).escritura).sort(), ["Novela", "Otra"]);
});

test("runtime: Progreso de escritura con Manuscrito/ vacío avisa 0 palabras", async () => {
	const { state } = await startPlugin(null, "Vacia/Personajes/Ana.md", ["Vacia/Manuscrito"]);
	state.commands["writing-progress"].callback();
	await settle();
	assert.deepEqual(state.notices, ["Manuscrito: 0 palabras\nHoy: 0 / 500 (0 %)\nRacha: 0 días"]);
});

// QA v3: a scene in a chapter subfolder belongs to the project, not to the subfolder.
test("runtime: guardar una escena en una subcarpeta de Manuscrito/ recuenta el proyecto", async () => {
	const { state, files } = await startPlugin(null);
	const TFile = files[0].constructor;
	state.onModify(new TFile("Novela/Manuscrito/Parte 1/Cap 03.md"));
	assert.deepEqual(state.timers.map((timer) => timer.ms), [5000]);
	state.timers[0].run();
	await settle();
	assert.deepEqual(state.saved.at(-1).escritura, { Novela: { [today]: { inicio: 5, total: 5 } } });
});

// QA v3: moving a scene out of Manuscrito/ (to a sheet folder) recounts the project it left.
test("runtime: mover una escena fuera de Manuscrito/ recuenta solo el origen", async () => {
	const { state, files } = await startPlugin({ escritura: { Novela: { [today]: { inicio: 5, total: 5 } } } });
	const TFile = files[0].constructor;
	files.splice(1, 1, new TFile("Novela/Personajes/Cap 02.md"));
	state.on.rename(files[1], "Novela/Manuscrito/Cap 02.md");
	assert.equal(state.timers.length, 1, "la ruta nueva no está en el manuscrito");
	state.timers[0].run();
	await settle();
	assert.deepEqual(state.saved.at(-1).escritura.Novela[today], { inicio: 5, total: 3 });
});
