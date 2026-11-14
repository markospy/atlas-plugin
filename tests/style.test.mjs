import assert from "node:assert/strict";
import test from "node:test";

import { SEVERITIES, parseSkill, skillFolder, skillNote, skillsFor } from "../src/style.ts";

const VOICE = `---
tipo: skill
nombre: "Marcos no dice palabrotas"
alcance: personaje
aplica_a: ["[[Marcos]]"]
severidad: obligatoria
verificacion: ia
---

## Regla
`;

const ADVERBS = `---
tipo: skill
nombre: Sin adverbios en -mente en diálogos
alcance: global          # global | personaje | POV | capítulo | escena
aplica_a: []
severidad: aviso         # sugerencia | aviso | obligatoria
verificacion: patron     # patron (sin IA) | ia
patron: '\\b\\w+mente\\b'
---
`;

test("la plantilla trae frontmatter completo y secciones", () => {
	const note = skillNote("Sin muletillas");
	for (const key of ["tipo: skill", "nombre:", "alcance:", "aplica_a:", "severidad:", "verificacion:", "patron:"]) {
		assert.match(note, new RegExp(`^${key}`, "m"));
	}
	assert.match(note, /## Regla/);
	assert.match(note, /## Ejemplo mal/);
	assert.match(note, /## Ejemplo bien/);
	assert.deepEqual(parseSkill(note), {
		nombre: "Sin muletillas",
		alcance: "global",
		aplica_a: [],
		severidad: "aviso",
		verificacion: "ia",
	});
	assert.equal(skillFolder("Novela/Manuscrito/Cap 01.md"), "Novela/Estilo");
	assert.equal(skillFolder("Novela/Estilo/Otra.md"), "Novela/Estilo");
});

test("severidades válidas y patrón expuesto solo en verificación por patrón", () => {
	assert.deepEqual(SEVERITIES, ["sugerencia", "aviso", "obligatoria"]);
	const adverbs = parseSkill(ADVERBS);
	assert.equal(adverbs.severidad, "aviso");
	assert.equal(adverbs.verificacion, "patron");
	assert.equal(adverbs.patron, "\\b\\w+mente\\b");
	assert.equal(new RegExp(adverbs.patron).test("dijo tristemente"), true);
	assert.equal(parseSkill(VOICE).severidad, "obligatoria");
	assert.equal("patron" in parseSkill(VOICE), false);
	assert.equal(parseSkill(VOICE.replace("obligatoria", "gravísima")).severidad, "aviso");
});

test("filtra skills por alcance personaje", () => {
	const skills = [parseSkill(ADVERBS), parseSkill(VOICE)];
	assert.deepEqual(
		skillsFor(skills, "personaje").map((skill) => skill.nombre),
		["Marcos no dice palabrotas"],
	);
	assert.deepEqual(
		skillsFor(skills, "personaje", "[[Marcos]]").map((skill) => skill.nombre),
		["Marcos no dice palabrotas"],
	);
	assert.deepEqual(skillsFor(skills, "personaje", "[[Elena]]"), []);
	assert.deepEqual(
		skillsFor(skills, "global").map((skill) => skill.nombre),
		["Sin adverbios en -mente en diálogos"],
	);
});

test("qa: la skill se crea en Estilo/ del proyecto desde cualquier nota", () => {
	assert.equal(skillFolder("Novela/Novela.md"), "Novela/Estilo");
	assert.equal(skillFolder("Novela.md"), "Estilo");
	assert.equal(skillFolder("Estilo/Otra.md"), "Estilo");
	assert.equal(skillFolder("Manuscrito/Cap 01.md"), "Estilo");
	const note = skillNote('Voz de "Marcos"');
	assert.equal(parseSkill(note).nombre, 'Voz de "Marcos"');
	assert.equal(note.split("\n")[0], "---");
});

test("qa: las tres severidades se leen y el patrón se oculta con verificación ia", () => {
	for (const severidad of ["sugerencia", "aviso", "obligatoria"]) {
		assert.equal(parseSkill(VOICE.replace("obligatoria", severidad)).severidad, severidad);
	}
	const ia = parseSkill(ADVERBS.replace("verificacion: patron", "verificacion: ia"));
	assert.equal(ia.verificacion, "ia");
	assert.equal("patron" in ia, false);
	const quoted = parseSkill(ADVERBS.replace(/^patron: .*$/m, 'patron: "\\\\bya\\\\b"'));
	assert.equal(quoted.patron, "\\bya\\b");
	assert.equal(new RegExp(quoted.patron).test("ya no"), true);
});

test("qa: filtro por personaje con varios destinos y alcances con tilde", () => {
	const both = parseSkill(VOICE.replace('aplica_a: ["[[Marcos]]"]', 'aplica_a: ["[[Marcos]]", "[[Elena]]"]'));
	assert.deepEqual(both.aplica_a, ["[[Marcos]]", "[[Elena]]"]);
	assert.equal(skillsFor([both], "personaje", "[[Elena]]").length, 1);
	const chapter = parseSkill(VOICE.replace("alcance: personaje", "alcance: capítulo"));
	assert.equal(chapter.alcance, "capítulo");
	assert.deepEqual(skillsFor([chapter, both], "personaje").map((s) => s.alcance), ["personaje"]);
	assert.equal(parseSkill(VOICE.replace("alcance: personaje", "alcance: libro")).alcance, "global");
});
