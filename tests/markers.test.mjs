import assert from "node:assert/strict";
import test from "node:test";

import { collectMarkers, insertMarker, parseMarkers } from "../src/markers.ts";

test("el parser encuentra TK e INVESTIGAR y los pierde al borrarlos", () => {
	const text = "Llega tarde. [TK]\nFalta el motivo. [INVESTIGAR: veneno]\n";
	const found = parseMarkers(text);
	assert.deepEqual(found, [
		{ kind: "tk", line: 1, label: "TK" },
		{ kind: "investigar", line: 2, label: "veneno" },
	]);

	const notes = [{ path: "Novela/Manuscrito/Cap 01.md", text }];
	assert.equal(collectMarkers(notes).length, 2);
	assert.deepEqual(collectMarkers([{ path: notes[0].path, text: "Llega tarde.\n" }]), []);
});

test("inserta el marcador en el cursor", () => {
	assert.equal(insertMarker("Hola mundo", 4, "tk"), "Hola[TK] mundo");
	assert.equal(insertMarker("Hola", 4, "investigar"), "Hola[INVESTIGAR: ]");
});
