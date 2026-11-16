import assert from "node:assert/strict";
import test from "node:test";

import { parseCharacter } from "../src/characters.ts";
import { CONTEXT_SECTIONS, buildSceneContext } from "../src/context.ts";
import { parseMemory } from "../src/memory.ts";
import { parseObject } from "../src/objects.ts";
import { parsePlace } from "../src/places.ts";
import { parseSkill } from "../src/style.ts";

// Proyecto mínimo: dos personajes, un objeto, un lugar, skills, memoria y trama.
const ELENA = parseCharacter(`---
tipo: personaje
nombre: "Elena"
alias: ["Lena"]
relaciones:
  - con: "[[Marcos]]"
    tipo: "aliado"
    desde: "[[Cap 01]]"
---
`);
const IVAN = parseCharacter(`---
tipo: personaje
nombre: "Iván"
alias: []
relaciones: []
---
`);
const CARTA = parseObject(`---
tipo: objeto
nombre: "Carta"
posesiones:
  - poseedor: "[[Elena]]"
    capitulo: "[[Cap 02]]"
---
`);
const CASA = parsePlace(`---
tipo: lugar
nombre: "Casa del lago"
padre: ""
estados:
  - capitulo: "[[Cap 01]]"
    descripcion: "intacta"
  - capitulo: "[[Cap 04]]"
    descripcion: "quemada"
---
`);
const SKILLS = [
	parseSkill(`---\ntipo: skill\nnombre: "Raya en diálogos"\nalcance: global\naplica_a: []\nseveridad: obligatoria\nverificacion: ia\n---\n`),
	parseSkill(`---\ntipo: skill\nnombre: "Voz seca"\nalcance: POV\naplica_a: ["[[Elena]]"]\nseveridad: aviso\nverificacion: ia\n---\n`),
	parseSkill(`---\ntipo: skill\nnombre: "Tartamudea"\nalcance: personaje\naplica_a: ["Iván"]\nseveridad: aviso\nverificacion: ia\n---\n`),
	parseSkill(`---\ntipo: skill\nnombre: "Habla en verso"\nalcance: personaje\naplica_a: ["Marcos"]\nseveridad: aviso\nverificacion: ia\n---\n`),
];
const MEMORIA = parseMemory(`---
tipo: memoria
capitulo: 2
hechos:
  - id: carta
    texto: "La carta es falsa"
    verdad: false
conocimiento:
  - hecho: carta
    quien: "[[Elena]]"
    estado: sospecha
  - hecho: carta
    quien: lector
    estado: sabe
---
`);
const ESCENA = `---
pov: "[[Elena]]"
subtrama: "La herencia"
---
Lena guarda la Carta. Iván la mira desde la puerta de la casa.
`;

function project(overrides = {}) {
	return {
		capitulo: 3,
		escena: ESCENA,
		skills: SKILLS,
		personajes: [ELENA, IVAN],
		objetos: [CARTA],
		lugares: [CASA],
		memorias: [MEMORIA],
		resumenes: [
			{ capitulo: 1, texto: "Elena llega al lago." },
			{ capitulo: 2, texto: "Elena encuentra la carta." },
			{ capitulo: 3, texto: "No debe entrar: es el capítulo actual." },
		],
		trama: "## Premisa\nUna herencia disputada.",
		presupuesto: 10_000,
		...overrides,
	};
}

function section(context, nombre) {
	return context.secciones.find((s) => s.nombre === nombre)?.texto ?? "";
}

test("devuelve las secciones documentadas en orden", () => {
	const context = buildSceneContext(project());
	assert.deepEqual(CONTEXT_SECTIONS, ["skills", "fichas", "mundo", "conocimiento", "resumenes", "trama", "escena"]);
	assert.deepEqual(
		context.secciones.map((s) => s.nombre),
		CONTEXT_SECTIONS,
	);
	assert.deepEqual(context.recortadas, []);
});

test("skills: globales, del POV y de los personajes presentes", () => {
	const skills = section(buildSceneContext(project()), "skills");
	assert.match(skills, /Raya en diálogos/);
	assert.match(skills, /Voz seca/);
	assert.match(skills, /Tartamudea/);
	assert.doesNotMatch(skills, /Habla en verso/);
});

test("fichas, mundo y conocimiento de lo que aparece en la escena", () => {
	const context = buildSceneContext(project());
	const fichas = section(context, "fichas");
	assert.match(fichas, /Elena/);
	assert.match(fichas, /Iván/);
	assert.match(fichas, /Carta/);
	assert.doesNotMatch(fichas, /Casa del lago/); // "casa" no es "Casa del lago"
	const mundo = section(context, "mundo");
	assert.match(mundo, /Elena → Marcos: aliado/);
	assert.match(mundo, /Carta: Elena/);
	const conocimiento = section(context, "conocimiento");
	assert.match(conocimiento, /Elena · sospecha · La carta es falsa/);
	assert.match(conocimiento, /lector · sabe · La carta es falsa/);
});

test("resúmenes previos, trama y texto de la escena", () => {
	const context = buildSceneContext(project());
	const resumenes = section(context, "resumenes");
	assert.match(resumenes, /Cap 01: Elena llega al lago/);
	assert.match(resumenes, /Cap 02/);
	assert.doesNotMatch(resumenes, /capítulo actual/);
	assert.match(section(context, "trama"), /Subtrama activa: La herencia/);
	assert.match(section(context, "trama"), /Una herencia disputada/);
	assert.equal(section(context, "escena"), "Lena guarda la Carta. Iván la mira desde la puerta de la casa.");
});

test("respeta el presupuesto máximo de caracteres", () => {
	for (const presupuesto of [0, 40, 120, 300]) {
		const context = buildSceneContext(project({ presupuesto }));
		const total = context.secciones.reduce((sum, s) => sum + s.texto.length, 0);
		assert.ok(total <= presupuesto, `${total} > ${presupuesto}`);
		assert.equal(context.total, total);
		assert.ok(context.recortadas.length > 0);
	}
	// La escena se conserva antes que los resúmenes.
	const tight = buildSceneContext(project({ presupuesto: 70 }));
	assert.match(section(tight, "escena"), /Lena guarda/);
	assert.ok(tight.recortadas.includes("resumenes"));
});

test("omite secciones vacías sin fallar", () => {
	const context = buildSceneContext({
		capitulo: 1,
		escena: "Nadie aparece.",
		skills: [],
		personajes: [],
		objetos: [],
		lugares: [],
		memorias: [],
		resumenes: [],
		trama: "",
		presupuesto: 1000,
	});
	assert.deepEqual(
		context.secciones.map((s) => s.nombre),
		["escena"],
	);
	assert.deepEqual(buildSceneContext({ ...project(), escena: "", presupuesto: 0 }).secciones, []);
});

// QA (v1): bordes del presupuesto, prioridad, corte y secciones vacías.
const FULL = buildSceneContext(project()).total;

test("presupuesto: límite exacto, límite + 1 y límite − 1", () => {
	for (const presupuesto of [FULL, FULL + 1]) {
		const context = buildSceneContext(project({ presupuesto }));
		assert.equal(context.total, FULL);
		assert.deepEqual(context.recortadas, []);
	}
	const short = buildSceneContext(project({ presupuesto: FULL - 1 }));
	assert.equal(short.total, FULL - 1);
	assert.deepEqual(short.recortadas, ["resumenes"]); // la de menor prioridad
	const resumenes = section(short, "resumenes");
	assert.ok(resumenes.startsWith("…"), resumenes); // los resúmenes conservan el final
	assert.ok(resumenes.endsWith("Elena encuentra la carta."), resumenes);
});

test("prioridad: con sitio solo para escena y skills, quedan esas dos", () => {
	const full = buildSceneContext(project());
	const presupuesto = section(full, "escena").length + section(full, "skills").length;
	const context = buildSceneContext(project({ presupuesto }));
	assert.deepEqual(
		context.secciones.map((s) => s.nombre),
		["skills", "escena"],
	);
	assert.deepEqual(context.recortadas, ["fichas", "mundo", "conocimiento", "resumenes", "trama"]);
	assert.equal(context.total, presupuesto);
});

test("la escena cortada conserva el final; skills cortadas conservan el principio", () => {
	const escena = section(buildSceneContext(project()), "escena");
	const tight = buildSceneContext(project({ presupuesto: 20 }));
	assert.equal(section(tight, "escena"), `…${escena.slice(escena.length - 19)}`);
	assert.deepEqual(
		tight.secciones.map((s) => s.nombre),
		["escena"],
	);
	const skills = section(buildSceneContext(project()), "skills");
	const head = buildSceneContext(project({ presupuesto: escena.length + 10 }));
	assert.equal(section(head, "skills"), `${skills.slice(0, 9)}…`);
});

test("presupuesto 1, 0 o negativo: nada entra, sin «…» suelto y sin fallar", () => {
	for (const presupuesto of [1, 0, -5]) {
		const context = buildSceneContext(project({ presupuesto }));
		assert.deepEqual(context.secciones, []);
		assert.equal(context.total, 0);
		assert.deepEqual(context.recortadas, CONTEXT_SECTIONS);
	}
});

test("skills de capítulo: solo las del capítulo N", () => {
	const skills = [
		parseSkill(`---\ntipo: skill\nnombre: "Ritmo lento"\nalcance: capítulo\naplica_a: ["[[Cap 03]]"]\nseveridad: aviso\nverificacion: ia\n---\n`),
		parseSkill(`---\ntipo: skill\nnombre: "Clímax"\nalcance: capítulo\naplica_a: ["[[Cap 04]]"]\nseveridad: aviso\nverificacion: ia\n---\n`),
	];
	const texto = section(buildSceneContext(project({ skills })), "skills");
	assert.match(texto, /Ritmo lento \(capítulo\)/);
	assert.doesNotMatch(texto, /Clímax/);
});

test("un personaje entra solo por su alias, sin pov", () => {
	const context = buildSceneContext(project({ escena: "Lena cierra la puerta." }));
	const fichas = section(context, "fichas");
	assert.match(fichas, /Personaje: Elena \(alias: Lena\)/);
	assert.doesNotMatch(fichas, /Iván/);
	assert.doesNotMatch(section(context, "skills"), /Voz seca/); // sin pov no hay skill de POV
});

test("omite secciones de solo espacios y escenas con solo frontmatter", () => {
	const base = {
		capitulo: 2,
		skills: [],
		personajes: [],
		objetos: [],
		lugares: [],
		memorias: [],
		resumenes: [{ capitulo: 1, texto: "  \n " }],
		trama: "   \n",
		presupuesto: 1000,
	};
	assert.deepEqual(buildSceneContext({ ...base, escena: `---\npov: "[[Nadie]]"\n---\n` }).secciones, []);
	assert.deepEqual(buildSceneContext({ ...base, escena: `---\npov: "[[Nadie]]"\n---` }).secciones, []);
	const crlf = buildSceneContext({ ...base, escena: `---\r\nsubtrama: ""\r\n---\r\nHola.\r\n` });
	assert.deepEqual(crlf.secciones, [{ nombre: "escena", texto: "Hola." }]);
});

test("mundo y fichas de un lugar nombrado: estado vigente en N", () => {
	const context = buildSceneContext(project({ capitulo: 4, escena: "Elena vuelve a la Casa del lago." }));
	assert.match(section(context, "fichas"), /Lugar: Casa del lago/);
	assert.match(section(context, "mundo"), /- Casa del lago: quemada/);
	assert.doesNotMatch(section(context, "mundo"), /intacta/);
});

test("una escena que empieza con un corte `---` conserva todo su texto", () => {
	const escena = "---\nPrimera parte.\n---\nSegunda parte.";
	const context = buildSceneContext(project({ escena }));
	assert.equal(section(context, "escena"), escena);
	const crlf = buildSceneContext(project({ escena: "---\r\nPrimera parte.\r\n---\r\nSegunda parte." }));
	assert.equal(section(crlf, "escena"), escena);
});

test("skills de alcance escena no entran: el builder no recibe el nombre de la escena", () => {
	const skills = [
		parseSkill(`---\ntipo: skill\nnombre: "Silencio"\nalcance: escena\naplica_a: ["[[Escena 1]]"]\nseveridad: aviso\nverificacion: ia\n---\n`),
	];
	assert.equal(section(buildSceneContext(project({ skills })), "skills"), "");
});

test("el corte no parte un emoji", () => {
	const base = { capitulo: 1, skills: [], personajes: [], objetos: [], lugares: [], memorias: [], resumenes: [], trama: "" };
	const tail = buildSceneContext({ ...base, escena: "😀😀", presupuesto: 2 });
	assert.deepEqual(tail.secciones, [{ nombre: "escena", texto: "…" }]);
	const tail4 = buildSceneContext({ ...base, escena: "a😀😀", presupuesto: 4 });
	assert.equal(section(tail4, "escena"), "…😀");
	const head = buildSceneContext({ ...base, escena: "x", trama: "😀😀", presupuesto: 3 });
	assert.equal(section(head, "trama"), "…");
	for (const context of [tail, tail4, head]) {
		assert.ok(context.total <= context.secciones.length + 4);
		for (const s of context.secciones) {
			assert.doesNotMatch(s.texto, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
		}
	}
});

// QA (v2): presupuesto no finito y cuerpo de la escena tras un frontmatter real.
test("presupuesto NaN: nada entra y sin fallar; Infinity: entra todo", () => {
	const nan = buildSceneContext(project({ presupuesto: Number.NaN }));
	assert.deepEqual(nan.secciones, []);
	assert.equal(nan.total, 0);
	assert.deepEqual(nan.recortadas, CONTEXT_SECTIONS);
	const all = buildSceneContext(project({ presupuesto: Number.POSITIVE_INFINITY }));
	assert.equal(all.total, FULL);
	assert.deepEqual(all.recortadas, []);
});

test("frontmatter real seguido de cortes `---`: sale el frontmatter, quedan los cortes", () => {
	const escena = "---\npov: \"[[Elena]]\"\n---\nPrimera parte.\n---\nSegunda parte.";
	const context = buildSceneContext(project({ escena }));
	assert.equal(section(context, "escena"), "Primera parte.\n---\nSegunda parte.");
	assert.match(section(context, "fichas"), /Personaje: Elena/); // el pov sigue leyéndose
	const abierto = "---\npov: Elena\nSin cierre.";
	assert.equal(section(buildSceneContext(project({ escena: abierto })), "escena"), abierto);
});
