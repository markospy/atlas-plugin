import assert from "node:assert/strict";
import test from "node:test";

import esbuild from "esbuild";

import { CoWriteSession, propose } from "../src/cowrite.ts";

const NOTE = "Elena abrió la puerta.\nLa casa estaba fría.";
const CONTEXT = { secciones: [], total: 0, recortadas: [] };

/** Minimal DOM node: enough of Obsidian's `createEl` / `empty` for the modal. */
function node(tag = "div", text = "", cls = "") {
	return {
		tag,
		text,
		cls,
		children: [],
		listeners: {},
		createEl(childTag, options = {}) {
			const child = node(childTag, options.text ?? "", options.cls ?? "");
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

const notices = [];
const obsidian = {
	Modal: class {
		constructor(app) {
			this.app = app;
			this.contentEl = node();
			this.closed = false;
		}
		open() {
			this.onOpen();
		}
		close() {
			this.closed = true;
		}
	},
	Notice: class {
		constructor(message) {
			notices.push(message);
		}
	},
};

/** Bundle the real modal with `obsidian` swapped for the stub above. */
async function loadModal() {
	const built = await esbuild.build({
		entryPoints: ["src/cowrite-modal.ts"],
		bundle: true,
		external: ["obsidian"],
		format: "cjs",
		platform: "node",
		write: false,
	});
	const module = { exports: {} };
	new Function("module", "exports", "require", built.outputFiles[0].text)(module, module.exports, (id) => {
		assert.equal(id, "obsidian");
		return obsidian;
	});
	return module.exports.CoWriteModal;
}

/** Editor stub that records every write. */
function editor(text) {
	const writes = [];
	return {
		writes,
		getValue: () => text,
		setValue: (value) => {
			writes.push(value);
			text = value;
		},
	};
}

/** The mode buttons start an async request; let it finish. */
const settle = () => new Promise((resolve) => setImmediate(resolve));
const button = (el, label) => findAll(el, (child) => child.tag === "button" && child.text === label)[0];
const findAll = (el, match) => el.children.flatMap((child) => [...(match(child) ? [child] : []), ...findAll(child, match)]);

async function openOnDiff(reply, note = NOTE, backup = async () => {}) {
	const CoWriteModal = await loadModal();
	const session = new CoWriteSession();
	const ed = editor(note);
	const ask = (modo, actual) => propose({ complete: async () => reply }, modo, actual, CONTEXT);
	const modal = new CoWriteModal({}, ed, session, ask, backup);
	modal.open();
	button(modal.contentEl, "Alternativa").listeners.click();
	await settle();
	return { modal, session, ed };
}

test("modal: la propuesta se ve como diff -/+ contra la nota y no escribe nada todavía", async () => {
	const { modal, ed } = await openOnDiff("Elena abrió la puerta.\nLa casa olía a humo.");
	const lines = findAll(modal.contentEl, (child) => child.cls.startsWith("atlas-diff-")).map((child) => child.text);
	assert.deepEqual(lines, ["  Elena abrió la puerta.", "- La casa estaba fría.", "+ La casa olía a humo."]);
	assert.deepEqual(ed.writes, []);
});

test("modal: Rechazar no escribe en la nota y queda en el historial", async () => {
	const { modal, session, ed } = await openOnDiff("Otra escena.");
	button(modal.contentEl, "Rechazar").listeners.click();
	assert.deepEqual(ed.writes, []);
	assert.equal(ed.getValue(), NOTE);
	assert.equal(modal.closed, true);
	assert.deepEqual(
		session.historial.map((entry) => entry.decision),
		["rechazada"],
	);
});

test("modal: Aprobar escribe la propuesta una vez y la registra", async () => {
	const { modal, session, ed } = await openOnDiff("Otra escena.");
	button(modal.contentEl, "Aprobar").listeners.click();
	await settle();
	assert.deepEqual(ed.writes, ["Otra escena."]);
	assert.equal(session.historial[0].decision, "aprobada");
	assert.equal(modal.closed, true);
});

test("modal: Aprobar con la nota cambiada no escribe y avisa", async () => {
	const { modal, session, ed } = await openOnDiff("Otra escena.");
	ed.getValue = () => `${NOTE}\nUna línea nueva.`;
	notices.length = 0;
	button(modal.contentEl, "Aprobar").listeners.click();
	await settle();
	assert.deepEqual(ed.writes, []);
	assert.equal(session.historial.length, 0);
	assert.match(notices[0], /cambió/);
});

test("modal: Aprobar respalda la nota actual antes de escribir", async () => {
	const events = [];
	const { modal, ed } = await openOnDiff("Otra escena.", NOTE, async (actual) => {
		events.push(`respaldo:${actual}`);
	});
	const setValue = ed.setValue;
	ed.setValue = (value) => {
		events.push(`escribe:${value}`);
		setValue(value);
	};
	button(modal.contentEl, "Aprobar").listeners.click();
	await settle();
	assert.deepEqual(events, [`respaldo:${NOTE}`, "escribe:Otra escena."]);
});

test("modal: si el respaldo falla no escribe y avisa", async () => {
	const { modal, session, ed } = await openOnDiff("Otra escena.", NOTE, async () => {
		throw new Error("disco lleno");
	});
	notices.length = 0;
	button(modal.contentEl, "Aprobar").listeners.click();
	await settle();
	assert.deepEqual(ed.writes, []);
	assert.equal(session.historial.length, 0);
	assert.deepEqual(notices, ["disco lleno"]);
	assert.equal(modal.closed, true);
});

test("modal: con la nota cambiada no se hace respaldo", async () => {
	let backups = 0;
	const { modal, ed } = await openOnDiff("Otra escena.", NOTE, async () => {
		backups++;
	});
	ed.getValue = () => `${NOTE}\nUna línea nueva.`;
	button(modal.contentEl, "Aprobar").listeners.click();
	await settle();
	assert.equal(backups, 0);
	assert.deepEqual(ed.writes, []);
});

test("modal: un proveedor que falla cierra sin escribir y avisa", async () => {
	const CoWriteModal = await loadModal();
	const ed = editor(NOTE);
	const modal = new CoWriteModal(
		{},
		ed,
		new CoWriteSession(),
		async () => {
			throw new Error("sin conexión");
		},
		async () => {},
	);
	notices.length = 0;
	modal.open();
	button(modal.contentEl, "Borrador").listeners.click();
	await settle();
	assert.deepEqual(ed.writes, []);
	assert.equal(modal.closed, true);
	assert.deepEqual(notices, ["sin conexión"]);
});
