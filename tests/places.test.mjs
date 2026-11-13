import assert from "node:assert/strict";
import test from "node:test";

import { parsePlace, placeFolder, placeNote } from "../src/places.ts";

const NESTED = `---
tipo: lugar
nombre: "Cocina"
padre: "[[Casa de Elena]]"
estados:
  - capitulo: "[[Cap 12]]"
    descripcion: "El fuego toma los armarios"
---

## Vista
`;

test("lee el lugar padre y un cambio de estado", () => {
	assert.deepEqual(parsePlace(NESTED), {
		nombre: "Cocina",
		padre: "[[Casa de Elena]]",
		estados: [{ capitulo: "[[Cap 12]]", descripcion: "El fuego toma los armarios" }],
	});
	const note = placeNote("Cocina");
	assert.match(note, /## Vista/);
	assert.match(note, /## Sonido/);
	assert.match(note, /## Olor/);
	assert.match(note, /## Tacto/);
	assert.match(note, /## Disposición/);
	assert.match(note, /## Atmósfera/);
	assert.deepEqual(parsePlace(note).estados, []);
	assert.equal(placeFolder("Novela/Manuscrito/Cap 01.md"), "Novela/Lugares");
});
