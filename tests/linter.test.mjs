import assert from "node:assert/strict";
import test from "node:test";

import { BASE_RULES, ignoreHere, lint, patternRules } from "../src/linter.ts";
import { parseSkill } from "../src/style.ts";

const ids = (text, rules = BASE_RULES) => lint(text, rules).map((f) => `${f.line}:${f.rule}`);

test("hay al menos cinco reglas base, todas con mensaje y severidad aviso", () => {
	assert.ok(BASE_RULES.length >= 5);
	for (const rule of BASE_RULES) {
		assert.ok(rule.id.length > 0 && rule.message.length > 0);
		assert.equal(rule.severidad, "aviso");
	}
});

test("raya: el guion o la raya con espacio no abren diálogo", () => {
	assert.deepEqual(ids("- Hola.\n– Adiós.\n— Bien.\n—Así sí."), ["1:raya-dialogo", "2:raya-dialogo", "3:raya-dialogo"]);
	assert.deepEqual(ids("Una lista - con guion en medio."), []);
	assert.deepEqual(ids("Fin de escena.\n\n---\n\nOtra escena.\n* * *\n___"), []);
});

test("gerundios: tres o más en la misma frase", () => {
	assert.deepEqual(ids("Salió corriendo, mirando atrás y temiendo lo peor."), ["1:gerundios-encadenados"]);
	assert.deepEqual(ids("Salió corriendo. Miró atrás cuando pudo, temiendo lo peor."), []);
	assert.deepEqual(ids("Iba dando, yendo y corriendo."), ["1:gerundios-encadenados"]);
});

test("dijo: dos veces en la misma línea o en líneas seguidas", () => {
	assert.deepEqual(ids("—Hola —dijo Ana.\n\n—Hola —dijo Luis."), ["3:dijo-repetido"]);
	assert.deepEqual(ids("Dijo que sí y luego dijo que no."), ["1:dijo-repetido"]);
	assert.deepEqual(ids("—Hola —dijo Ana.\n\n—Hola —respondió Luis."), []);
});

test("adverbios en -mente solo en la acotación del diálogo", () => {
	assert.deepEqual(ids("—No —dijo tristemente."), ["1:mente-acotacion"]);
	assert.deepEqual(ids("—Tristemente, no —dijo."), []);
	assert.deepEqual(ids("Lo dijo tristemente."), []);
	assert.deepEqual(ids("—Tiene la mente en blanco —dijo."), []);
});

test("dequeísmo: verbo de pensar o decir + de que", () => {
	assert.deepEqual(ids("Pienso de que vendrá."), ["1:dequeismo"]);
	assert.deepEqual(ids("Estoy seguro de que vendrá."), []);
});

test("el hallazgo trae línea, columna, mensaje y extracto; ignora el frontmatter", () => {
	const text = "---\ntitulo: - x\n---\nPienso de que sí.";
	const [finding] = lint(text, BASE_RULES);
	assert.equal(finding.line, 4);
	assert.equal(finding.column, 1);
	assert.equal(finding.match, "Pienso de que");
	assert.match(finding.message, /dequeísmo/i);
	assert.equal(lint(text, BASE_RULES).length, 1);
});

test("las skills con patrón se ejecutan y listan línea + mensaje", () => {
	const skill = parseSkill(`---
nombre: Sin "ya"
alcance: global
severidad: obligatoria
verificacion: patron
patron: '\\bya\\b'
---
`);
	const ia = parseSkill("---\nnombre: Voz\nverificacion: ia\n---\n");
	const broken = parseSkill("---\nnombre: Rota\nverificacion: patron\npatron: '(['\n---\n");
	const rules = patternRules([skill, ia, broken]);
	assert.equal(rules.length, 1);
	const findings = lint("Hola.\nYa voy, ya.", rules);
	assert.deepEqual(
		findings.map((f) => [f.line, f.column, f.message, f.severidad]),
		[
			[2, 1, 'Sin "ya"', "obligatoria"],
			[2, 9, 'Sin "ya"', "obligatoria"],
		],
	);
});

test("ignorar aquí suprime solo ese hallazgo en esa nota", () => {
	const text = "Pienso de que sí.\n- Hola.\nCreo de que no.";
	const [first] = lint(text, BASE_RULES);
	const ignored = ignoreHere(text, first);
	assert.equal(ignored.split("\n")[0], "Pienso de que sí. %% atlas-ignorar: dequeismo %%");
	assert.deepEqual(ids(ignored), ["2:raya-dialogo", "3:dequeismo"]);
	assert.equal(ignoreHere(ignored, first), ignored);
	const second = lint(ignored, BASE_RULES)[0];
	assert.deepEqual(ids(ignoreHere(ignored, second)), ["3:dequeismo"]);
});

test("qa: dos gerundios en la frase no bastan; tres en frases distintas tampoco", () => {
	assert.deepEqual(ids("Salió corriendo y mirando atrás."), []);
	assert.deepEqual(ids("Iba corriendo. Siguió mirando. Acabó temiendo."), []);
});

test("qa: el comentario de ignorar no mueve la columna ni calla otras reglas", () => {
	assert.deepEqual(
		lint("Pienso de que sí. %% atlas-ignorar: otra %% Creo de que no.", BASE_RULES).map((f) => [f.column, f.match]),
		[
			[1, "Pienso de que"],
			[45, "Creo de que"],
		],
	);
});

test("qa: ignorar aquí una skill con patrón la calla solo en esa línea", () => {
	const rules = patternRules([parseSkill("---\nnombre: Sin \"ya\"\nverificacion: patron\npatron: '\\bya\\b'\n---\n")]);
	const text = "Ya voy.\nYa está.";
	const [first] = lint(text, rules);
	assert.equal(first.rule, "skill-sin-ya");
	assert.deepEqual(ids(ignoreHere(text, first), rules), ["2:skill-sin-ya"]);
});

test("qa: un patrón que casa vacío termina y no cuelga el linter", () => {
	const rules = patternRules([parseSkill("---\nnombre: Vacío\nverificacion: patron\npatron: 'x*'\n---\n")]);
	assert.equal(lint("ab", rules).length, 3);
});

test("qa v2: separadores de escena con espacios o más de tres signos no son diálogo", () => {
	assert.deepEqual(ids("Fin.\n- - -\n***\n-----\n_ _ _\nOtra."), []);
	assert.deepEqual(ids("- - Hola.\n---Hola."), ["1:raya-dialogo", "2:raya-dialogo"]);
});

test("qa v2: «ando» (4 letras) y los falsos con mayúscula no cuentan como gerundio", () => {
	assert.deepEqual(ids("Ando cansado, comiendo y bebiendo."), []);
	assert.deepEqual(ids("Cuando pudo, Fernando siguió corriendo y mirando."), []);
	assert.deepEqual(ids("Siguió dando vueltas, yendo y viniendo."), ["1:gerundios-encadenados"]);
});
