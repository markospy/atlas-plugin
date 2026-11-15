import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_PROVIDER_SETTINGS } from "../src/providers.ts";
import { chatUrl, NO_PROVIDER, parseFindings, reviewPrompt, reviewScene } from "../src/review.ts";
import { parseSkill } from "../src/style.ts";

const ESCENA = `---
pov: "[[Elena]]"
---
Elena entra en la cocina.
—No —dijo tristemente.
`;

function input(overrides = {}) {
	return {
		capitulo: 2,
		escena: ESCENA,
		skills: [
			parseSkill(`---\ntipo: skill\nnombre: "Mostrar, no contar"\nalcance: global\naplica_a: []\nseveridad: aviso\nverificacion: ia\n---\n`),
		],
		personajes: [],
		objetos: [],
		lugares: [],
		memorias: [],
		resumenes: [],
		trama: "",
		presupuesto: 10_000,
		...overrides,
	};
}

const LOCAL = { ...DEFAULT_PROVIDER_SETTINGS, endpoint: "http://127.0.0.1:11434", model: "llama3" };

/** Mock provider: records each request and answers with `content`. */
function mock(content) {
	const calls = [];
	const send = async (url, body) => {
		calls.push({ url, body });
		return { choices: [{ message: { role: "assistant", content } }] };
	};
	return { calls, send };
}

test("con proveedor mock: hallazgos con tipo y ancla al texto", async () => {
	const reply = JSON.stringify([
		{ tipo: "estilo", cita: "dijo tristemente", mensaje: "Adverbio en -mente en la acotación." },
		{ tipo: "conocimiento", cita: "Elena entra", mensaje: "Elena aún no conoce la cocina." },
	]);
	const { calls, send } = mock("```json\n" + reply + "\n```");
	const result = await reviewScene(input(), LOCAL, send);
	assert.equal(result.ok, true);
	assert.deepEqual(result.hallazgos, [
		{ tipo: "estilo", cita: "dijo tristemente", mensaje: "Adverbio en -mente en la acotación.", linea: 5, columna: 6 },
		{ tipo: "conocimiento", cita: "Elena entra", mensaje: "Elena aún no conoce la cocina.", linea: 4, columna: 1 },
	]);
	assert.equal(result.descartados, 0);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, "http://127.0.0.1:11434/v1/chat/completions");
	assert.equal(calls[0].body.model, "llama3");
	assert.equal(calls[0].body.stream, false);
	assert.match(calls[0].body.messages[0].content, /Mostrar, no contar/);
	assert.match(calls[0].body.messages[0].content, /dijo tristemente/);
});

test("descarta tipos desconocidos y citas que no están en la escena", () => {
	const reply = JSON.stringify([
		{ tipo: "trama", cita: "Elena", mensaje: "x" },
		{ tipo: "estilo", cita: "no aparece", mensaje: "x" },
		{ tipo: "estilo", cita: "Elena", mensaje: 3 },
		{ tipo: "continuidad", cita: "", mensaje: "x" },
		{ tipo: "continuidad", cita: "pov", mensaje: "solo en el frontmatter" },
		"texto suelto",
		{ tipo: "continuidad", cita: "cocina", mensaje: "La cocina ardió en el cap. 1." },
	]);
	const parsed = parseFindings(reply, ESCENA);
	assert.equal(parsed.descartados, 6);
	assert.deepEqual(parsed.hallazgos.map((h) => [h.tipo, h.linea, h.columna]), [["continuidad", 4, 19]]);
	assert.equal(parseFindings("no hay JSON", ESCENA), null);
	assert.deepEqual(parseFindings("[]", ESCENA), { hallazgos: [], descartados: 0 });
});

test("no modifica el manuscrito: la escena de entrada queda igual y solo se llama al proveedor", async () => {
	const scene = input();
	const before = JSON.stringify(scene);
	const { calls, send } = mock('[{"tipo":"estilo","cita":"tristemente","mensaje":"x"}]');
	await reviewScene(scene, LOCAL, send);
	assert.equal(JSON.stringify(scene), before);
	assert.equal(calls.length, 1);
	assert.doesNotMatch(calls[0].body.messages[0].content, /reescribe la escena/i);
});

test("sin proveedor configurado: mensaje claro, sin llamar y sin fallar", async () => {
	for (const settings of [
		{ ...DEFAULT_PROVIDER_SETTINGS, model: "" },
		{ ...LOCAL, endpoint: "  " },
		{ ...LOCAL, model: "" },
	]) {
		const { calls, send } = mock("[]");
		assert.deepEqual(await reviewScene(input(), settings, send), { ok: false, mensaje: NO_PROVIDER });
		assert.equal(calls.length, 0);
	}
});

test("host no permitido, red caída o respuesta rara: mensaje, sin fallar", async () => {
	const { calls, send } = mock("[]");
	const cloud = await reviewScene(input(), { ...LOCAL, endpoint: "https://api.openai.com/v1" }, send);
	assert.equal(cloud.ok, false);
	assert.match(cloud.mensaje, /Host no permitido/);
	assert.equal(calls.length, 0);

	const down = await reviewScene(input(), LOCAL, async () => {
		throw new Error("ECONNREFUSED");
	});
	assert.deepEqual(down, { ok: false, mensaje: "El proveedor no respondió: ECONNREFUSED" });

	for (const reply of [null, {}, { choices: [] }, { choices: [{ message: { content: "lo siento" } }] }]) {
		const odd = await reviewScene(input(), LOCAL, async () => reply);
		assert.equal(odd.ok, false);
		assert.match(odd.mensaje, /no devolvió hallazgos/);
	}
});

test("chatUrl: endpoint base, con /v1 o ya completo", () => {
	assert.equal(chatUrl("http://127.0.0.1:11434"), "http://127.0.0.1:11434/v1/chat/completions");
	assert.equal(chatUrl("http://localhost:1234/v1/"), "http://localhost:1234/v1/chat/completions");
	assert.equal(chatUrl("http://localhost:1234/v1/chat/completions"), "http://localhost:1234/v1/chat/completions");
});

test("el prompt respeta el presupuesto de contexto", () => {
	const long = `${"palabra ".repeat(5000)}`;
	const prompt = reviewPrompt(input({ escena: long, presupuesto: 100_000 }));
	assert.ok(prompt.length < 13_000, String(prompt.length));
});

test("encuentra el JSON aunque haya corchetes en la prosa del proveedor", () => {
	const hallazgo = '{"tipo":"estilo","cita":"Elena","mensaje":"x"}';
	for (const reply of [
		`Mira [1]: [${hallazgo}]`,
		`[${hallazgo}] — ver [nota]`,
		`Antes [a]\n\`\`\`json\n[${hallazgo}]\n\`\`\`\nDespués [b]`,
	]) {
		const parsed = parseFindings(reply, "Elena entra.\n");
		assert.notEqual(parsed, null, reply);
		assert.deepEqual(parsed.hallazgos.map((h) => [h.tipo, h.linea, h.columna]), [["estilo", 1, 1]], reply);
	}
	assert.equal(parseFindings("Solo [1] y [2], sin hallazgos.", "Elena entra.\n"), null);
});

test("respuesta cortada llena de [[enlaces]]: falla rápido, sin congelar la UI", () => {
	const item = '{"tipo":"continuidad","cita":"[[Elena]] entra","mensaje":"[[Elena]] estaba en [[Faro]] y [[Puerto]]"}';
	const truncated = `[${Array.from({ length: 200 }, () => item).join(",")}`.slice(0, -10);
	const prose = Array.from({ length: 1000 }, (_, at) => `[[Nota ${at}]]`).join(" ");
	for (const reply of [truncated, prose, `${prose} ${truncated}`]) {
		const started = performance.now();
		assert.equal(parseFindings(reply, "[[Elena]] entra.\n"), null);
		assert.ok(performance.now() - started < 200, `tardó ${Math.round(performance.now() - started)} ms`);
	}
});

test("encuentra el array aunque las citas lleven corchetes y siga prosa después", () => {
	const reply = 'Hallazgos: [{"tipo":"estilo","cita":"[[Elena]] entra","mensaje":"usa ] y [ sueltos"}] y nada más [fin].';
	const parsed = parseFindings(reply, "[[Elena]] entra.\n");
	assert.equal(parsed?.hallazgos.length, 1);
	assert.equal(parsed?.hallazgos[0].cita, "[[Elena]] entra");
});
