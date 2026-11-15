import assert from "node:assert/strict";
import test from "node:test";

import {
	countWords,
	dayKey,
	manuscriptWords,
	progress,
	progressNotice,
	recordTotal,
	streak,
} from "../src/stats.ts";

test("cuenta palabras sin frontmatter, con español, apóstrofos y CJK", () => {
	assert.equal(countWords("---\ntipo: escena\n---\nLlegó tarde, ¿por qué?\n"), 4);
	assert.equal(countWords("El hispano-árabe dijo l'amour 3 veces."), 6);
	assert.equal(countWords("Ella dijo 東京へ行く."), 7);
	assert.equal(countWords(""), 0);
});

test("suma solo las escenas bajo Manuscrito/ del proyecto", () => {
	const notes = [
		{ path: "Novela/Manuscrito/Cap 01.md", text: "Uno dos tres." },
		{ path: "Novela/Manuscrito/Cap 02/Escena.md", text: "Cuatro cinco." },
		{ path: "Novela/Personajes/Ana.md", text: "No cuenta nada aquí." },
		{ path: "Otra/Manuscrito/Cap 01.md", text: "Tampoco cuenta." },
	];
	assert.equal(manuscriptWords("Novela", notes), 5);
	assert.equal(manuscriptWords("", [{ path: "Manuscrito/Cap 01.md", text: "Hola mundo" }]), 2);
});

test("el progreso del día parte del último total de un día anterior", () => {
	let log = recordTotal({}, "2026-11-10", 1000);
	assert.deepEqual(log["2026-11-10"], { inicio: 1000, total: 1000 });
	log = recordTotal(log, "2026-11-10", 1300);
	log = recordTotal(log, "2026-11-11", 1450);
	assert.deepEqual(log["2026-11-11"], { inicio: 1300, total: 1450 });

	const today = progress(log, "2026-11-11", 500);
	assert.deepEqual(today, { total: 1450, hoy: 150, meta: 500, porcentaje: 30, racha: 2 });
	assert.equal(progress(log, "2026-11-11", 100).porcentaje, 100);
	assert.equal(progress(log, "2026-11-11", 0).porcentaje, 0);
	assert.equal(progress(recordTotal(log, "2026-11-11", 900), "2026-11-11", 500).hoy, 0);
});

test("la racha cuenta días seguidos con palabras y sigue viva si hoy aún no escribes", () => {
	const log = {
		"2026-10-30": { inicio: 0, total: 10 },
		"2026-10-31": { inicio: 10, total: 20 },
		"2026-11-01": { inicio: 20, total: 30 },
		"2026-11-02": { inicio: 30, total: 30 },
	};
	assert.equal(streak(log, "2026-11-01"), 3);
	assert.equal(streak(log, "2026-11-02"), 3);
	assert.equal(streak(log, "2026-11-03"), 0);
	assert.equal(streak({}, "2026-11-03"), 0);
});

test("la fecha es local y el aviso resume total, meta y racha", () => {
	assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
	assert.equal(
		progressNotice({ total: 1450, hoy: 150, meta: 500, porcentaje: 30, racha: 1 }),
		"Manuscrito: 1450 palabras\nHoy: 150 / 500 (30 %)\nRacha: 1 día",
	);
	assert.match(progressNotice({ total: 0, hoy: 0, meta: 0, porcentaje: 0, racha: 0 }), /sin meta diaria/);
});
