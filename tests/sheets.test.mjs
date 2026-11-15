import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { characterFolder, parseCharacter } from "../src/characters.ts";
import { memoryFolder, parseMemory } from "../src/memory.ts";
import { objectFolder, parseObject } from "../src/objects.ts";
import { parsePlace, placeFolder } from "../src/places.ts";
import { sheetFolder } from "../src/sheets.ts";

const CHARACTER = `---
tipo: personaje
nombre: "Elena Ruiz"
alias: ["la Doctora", "Ele"]
relaciones:
  - con: "[[Marcos]]"
    tipo: hermano
  - con: "[[Iván]]"
    tipo: rival
    desde: "[[Cap 07]]"
---
`;

const PLACE = `---
tipo: lugar
nombre: "Cocina"
padre: "[[Casa de Elena]]"
estados:
  - capitulo: "[[Cap 12]]"
    descripcion: "El fuego toma los armarios"
---
`;

const MEMORY = `---
tipo: memoria
capitulo: 3
hechos:
  - id: padre
    texto: "El juez es el padre de Elena"
    verdad: true
conocimiento:
  - hecho: padre
    quien: "[[Elena]]"
    estado: sabe
---
`;

const OBJECT = `---
tipo: objeto
nombre: "La carta"
posesiones:
  - poseedor: "[[Elena]]"
    capitulo: "[[Cap 02]]"
---
`;

const PARSERS = [
	["personaje", parseCharacter, CHARACTER, "relaciones"],
	["lugar", parsePlace, PLACE, "estados"],
	["memoria", parseMemory, MEMORY, "hechos"],
	["objeto", parseObject, OBJECT, "posesiones"],
];

const crlf = (note) => note.replace(/\n/g, "\r\n");
const trailingSpace = (note, key) => note.replace(`\n${key}:\n`, `\n${key}: \n`);
const zeroIndent = (note) => note.replace(/^ {2}/gm, "");

for (const [kind, parse, note, key] of PARSERS) {
	test(`la ficha de ${kind} con CRLF da lo mismo que con LF`, () => {
		assert.deepEqual(parse(crlf(note)), parse(note));
	});

	test(`la ficha de ${kind} acepta \`${key}: \` con espacio final y lista sin sangría`, () => {
		const expected = parse(note);
		assert.ok(expected[key].length > 0);
		assert.deepEqual(parse(trailingSpace(note, key)), expected);
		assert.deepEqual(parse(zeroIndent(note)), expected);
		assert.deepEqual(parse(crlf(zeroIndent(trailingSpace(note, key)))), expected);
	});
}

test("personajes, lugares, memoria y objetos no copian los helpers de frontmatter", () => {
	for (const file of ["characters", "places", "memory", "objects"]) {
		const source = readFileSync(new URL(`../src/${file}.ts`, import.meta.url), "utf8");
		assert.doesNotMatch(source, /function (frontmatterBody|scalar|unquote|parentOf)\b/, file);
		assert.match(source, /from "\.\/frontmatter\.ts"/, file);
	}
});

test("una sola función resuelve la carpeta de cada ficha", () => {
	const cases = [
		[characterFolder, "Personajes"],
		[placeFolder, "Lugares"],
		[memoryFolder, "_Memoria"],
		[objectFolder, "Objetos"],
	];
	for (const [resolve, folder] of cases) {
		for (const path of [
			"Novela/Manuscrito/Cap 01.md",
			`Novela/${folder}/Sub/Nota.md`,
			`${folder}/Nota.md`,
			"Suelta.md",
			"Notas/Idea.md",
		]) {
			assert.equal(resolve(path), sheetFolder(path, folder), `${folder} · ${path}`);
		}
	}
	assert.equal(sheetFolder("Novela/Manuscrito/Cap 01.md", "Lugares"), "Novela/Lugares");
	assert.equal(sheetFolder("Novela/Lugares/Casa/Cocina.md", "Lugares"), "Novela/Lugares");
	assert.equal(sheetFolder("Suelta.md", "Lugares"), "Lugares");
});

test("inProject: solo las notas del proyecto de la escena activa", async () => {
	const { inProject } = await import("../src/sheets.ts");
	const { projectOf } = await import("../src/entities.ts");
	assert.equal(projectOf("Novela A/Manuscrito/Cap 02/Escena 1.md"), "Novela A");
	assert.equal(projectOf("Sagas/Novela A/Manuscrito/Cap 02.md"), "Sagas/Novela A");
	assert.equal(projectOf("Manuscrito/Cap 02.md"), "");
	assert.equal(projectOf("Borradores/Cap 02.md"), "Borradores");
	const root = projectOf("Novela A/Manuscrito/Cap 02/Escena 1.md");
	const paths = ["Novela A/Personajes/Elena.md", "Novela B/Personajes/Elena.md", "Novela AB/Estilo/x.md", "Otra.md"];
	assert.deepEqual(paths.filter((path) => inProject(root, path)), ["Novela A/Personajes/Elena.md"]);
	assert.deepEqual(paths.filter((path) => inProject("", path)), paths);
});
