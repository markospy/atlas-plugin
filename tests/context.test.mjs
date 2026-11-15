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
