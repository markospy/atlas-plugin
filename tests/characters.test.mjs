import assert from "node:assert/strict";
import test from "node:test";

import { characterNote, parseCharacter, relationErrors } from "../src/characters.ts";

const SAMPLE = `---
tipo: personaje
nombre: "Elena Ruiz"
alias: ["la Doctora", "Ele"]
relaciones:
  - con: "[[Marcos]]"
    tipo: hermano
  - con: "[[Iván]]"
    tipo: rival
    desde: "[[Cap 07]]"
    nota: "Desde que él la delató"
---

## Físico
`;

test("parsea alias y relaciones temporales", () => {
	const sheet = parseCharacter(SAMPLE);
	assert.equal(sheet.nombre, "Elena Ruiz");
	assert.deepEqual(sheet.alias, ["la Doctora", "Ele"]);
	assert.deepEqual(sheet.relaciones, [
		{ con: "[[Marcos]]", tipo: "hermano" },
		{
			con: "[[Iván]]",
			tipo: "rival",
			desde: "[[Cap 07]]",
			nota: "Desde que él la delató",
		},
	]);
	assert.deepEqual(relationErrors(sheet.relaciones), []);
});

test("una relación sin wikilink se rechaza y la plantilla nace vacía", () => {
	assert.deepEqual(relationErrors([{ con: "Marcos", tipo: "hermano" }]), [
		"La relación «hermano» necesita un destino [[nota]].",
	]);
	const note = characterNote("Elena Ruiz");
	assert.match(note, /tipo: personaje/);
	assert.match(note, /## Psicología/);
	assert.deepEqual(parseCharacter(note).relaciones, []);
});
