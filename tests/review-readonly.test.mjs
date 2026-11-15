import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseFindings } from "../src/review.ts";

// Vault, file-manager and editor calls that change a note.
const WRITES =
	/\.(modify|process|create|createFolder|append|delete|trash|rename|copy|setValue|replaceRange|replaceSelection|setLine|transaction|processFrontMatter)\s*\(/;

function method(source, name) {
	const start = source.indexOf(`private async ${name}(`);
	assert.notEqual(start, -1, `${name} no está en main.ts`);
	const end = source.indexOf("\n\t}\n", start);
	return source.slice(start, end);
}

test("Revisar escena con IA no escribe: ni el comando ni el modal llaman a una API de escritura", () => {
	const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
	const command = method(main, "reviewWithAi");
	assert.doesNotMatch(command, WRITES);
	assert.match(command, /cachedRead/);

	const modal = readFileSync(new URL("../src/review-modal.ts", import.meta.url), "utf8");
	assert.doesNotMatch(modal, WRITES);
	assert.match(modal, /setCursor/);
});

test("ancla citas en una escena sin frontmatter", () => {
	const parsed = parseFindings(
		JSON.stringify([{ tipo: "estilo", cita: "tristemente", mensaje: "x" }]),
		"Elena entra.\n—No —dijo tristemente.\n",
	);
	assert.deepEqual(parsed.hallazgos.map((h) => [h.linea, h.columna]), [[2, 11]]);
	assert.equal(parsed.descartados, 0);
});
