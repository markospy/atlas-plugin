import assert from "node:assert/strict";
import test from "node:test";

import { inManuscript, manuscriptWords, progress, recordTotal, streak } from "../src/stats.ts";

test("bordes del manuscrito: carpeta parecida, otra extensión y mayúsculas", () => {
	assert.equal(inManuscript("Novela", "Novela/ManuscritoX/Cap.md"), false);
	assert.equal(inManuscript("Novela", "Novela/Manuscrito/Cap.canvas"), false);
	assert.equal(inManuscript("Novela", "Novela/Manuscrito/Cap.MD"), true);
	assert.equal(inManuscript("Nov", "Novela/Manuscrito/Cap.md"), false);
	assert.equal(manuscriptWords("Novela", []), 0);
});

test("la racha cruza fin de año y 29 de febrero, y se corta en un día sin registro", () => {
	const day = (inicio, total) => ({ inicio, total });
	assert.equal(streak({ "2025-12-31": day(0, 5), "2026-01-01": day(5, 9) }, "2026-01-01"), 2);
	assert.equal(streak({ "2028-02-28": day(0, 5), "2028-02-29": day(5, 9), "2028-03-01": day(9, 12) }, "2028-03-01"), 3);

	let log = recordTotal({}, "2026-11-10", 100);
	log = recordTotal(log, "2026-11-12", 160);
	assert.deepEqual(log["2026-11-12"], { inicio: 100, total: 160 });
	assert.equal(streak(log, "2026-11-12"), 1);
});

test("el porcentaje redondea y la meta decimal se trunca", () => {
	const log = { "2026-11-11": { inicio: 0, total: 1 } };
	assert.equal(progress(log, "2026-11-11", 3).porcentaje, 33);
	assert.equal(progress(log, "2026-11-11", 2.9).meta, 2);
	assert.equal(progress(log, "2026-11-11", -5).porcentaje, 0);
	assert.equal(progress({}, "2026-11-11", 500).total, 0);
});
