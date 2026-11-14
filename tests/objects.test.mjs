import assert from "node:assert/strict";
import test from "node:test";

import { holderAt, objectFolder, objectNote, parseObject } from "../src/objects.ts";

const REVOLVER = `---
tipo: objeto
nombre: "Revólver del abuelo"
valor_material: "Poco: oxidado"
valor_sentimental: "Elena: último recuerdo del abuelo"
funcion: "Pistola de Chéjov"
foreshadowing: "[[Cap 02]]"
posesiones:
  - poseedor: "[[Abuelo]]"
    capitulo: "[[Cap 01]]"
  - poseedor: "[[Elena]]"
    capitulo: "[[Cap 04]]"
  - poseedor: "[[Marcos]]"
    capitulo: "[[Cap 09]]"
---

## Descripción
`;

test("lee la ficha y responde quién tiene el objeto en cada capítulo", () => {
	const sheet = parseObject(REVOLVER);
	assert.equal(sheet.nombre, "Revólver del abuelo");
	assert.equal(sheet.valor_material, "Poco: oxidado");
	assert.equal(sheet.valor_sentimental, "Elena: último recuerdo del abuelo");
	assert.equal(sheet.funcion, "Pistola de Chéjov");
	assert.equal(sheet.foreshadowing, "[[Cap 02]]");
	assert.deepEqual(sheet.posesiones, [
		{ poseedor: "[[Abuelo]]", capitulo: "[[Cap 01]]" },
		{ poseedor: "[[Elena]]", capitulo: "[[Cap 04]]" },
		{ poseedor: "[[Marcos]]", capitulo: "[[Cap 09]]" },
	]);
	assert.equal(holderAt(sheet, 1), "[[Abuelo]]");
	assert.equal(holderAt(sheet, 3), "[[Abuelo]]");
	assert.equal(holderAt(sheet, 4), "[[Elena]]");
	assert.equal(holderAt(sheet, 8), "[[Elena]]");
	assert.equal(holderAt(sheet, 9), "[[Marcos]]");
	assert.equal(holderAt(sheet, 20), "[[Marcos]]");
});

test("nadie tiene el objeto antes de su primera posesión", () => {
	const sheet = parseObject(REVOLVER.replace('"[[Cap 01]]"', '"[[Cap 03]]"'));
	assert.equal(holderAt(sheet, 2), "");
});

test("la plantilla trae descripción, origen, valores y función", () => {
	const note = objectNote("Anillo");
	assert.match(note, /^tipo: objeto$/m);
	assert.match(note, /## Descripción/);
	assert.match(note, /## Origen/);
	assert.match(note, /## Valor material/);
	assert.match(note, /## Valor sentimental/);
	assert.match(note, /## Función en la trama/);
	const sheet = parseObject(note);
	assert.equal(sheet.nombre, "Anillo");
	assert.deepEqual(sheet.posesiones, []);
	assert.equal(holderAt(sheet, 1), "");
	assert.equal(objectFolder("Novela/Manuscrito/Cap 01.md"), "Novela/Objetos");
	assert.equal(objectFolder("Novela/Objetos/Anillo.md"), "Novela/Objetos");
});
