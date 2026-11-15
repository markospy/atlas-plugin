import assert from "node:assert/strict";
import test from "node:test";

import { buildFactGraph } from "../src/dependencies.ts";
import { parseMemory } from "../src/memory.ts";
import { confirmReanalysis, factChanges, mergeStale, parseStore, staleFrom } from "../src/stale.ts";

const memory = (chapter, hechos, usos) =>
	parseMemory(
		[
			"---",
			"tipo: memoria",
			`capitulo: ${chapter}`,
			hechos.length > 0 ? "hechos:" : "hechos: []",
			...hechos.flatMap(([id, texto]) => [`  - id: ${id}`, `    texto: "${texto}"`]),
			"conocimiento: []",
			usos.length > 0 ? "usos:" : "usos: []",
			...usos.flatMap((id) => [`  - hecho: ${id}`, `    quien: "[[Elena]]"`, "    modo: menciona"]),
			"---",
			"",
		].join("\n"),
	);

const ANTES = memory(3, [["carta", "Elena recibe la carta"], ["anillo", "El anillo es falso"]], []);
const LATER = [memory(9, [], ["carta"]), memory(10, [], ["anillo"]), memory(14, [], ["carta"]), memory(2, [], ["anillo"])];

// Ejemplo de docs/historial-chat.md § 3.5: el cap. 3 deja de introducir la carta.
test("carta eliminada del cap. 3 → caps 9 y 14 desactualizados, el 10 no", () => {
	const despues = memory(3, [["anillo", "El anillo es falso"]], []);
	const changes = factChanges(ANTES.hechos, despues.hechos);
	assert.deepEqual(changes, [{ hecho: "carta", cambio: "eliminado" }]);
	const stale = staleFrom(buildFactGraph([despues, ...LATER]), 3, changes);
	assert.deepEqual(stale, [
		{ capitulo: 9, motivos: ["El cap. 9 usa «carta», que ya no se introduce en el cap. 3."] },
		{ capitulo: 14, motivos: ["El cap. 14 usa «carta», que ya no se introduce en el cap. 3."] },
	]);
});

test("un hecho cambiado marca a quien lo usa después, no a capítulos anteriores", () => {
	const despues = memory(3, [["carta", "Elena recibe la carta"], ["anillo", "El anillo es auténtico"]], []);
	const changes = factChanges(ANTES.hechos, despues.hechos);
	assert.deepEqual(changes, [{ hecho: "anillo", cambio: "cambiado" }]);
	assert.deepEqual(staleFrom(buildFactGraph([despues, ...LATER]), 3, changes), [
		{ capitulo: 10, motivos: ["El cap. 10 usa «anillo», que cambió en el cap. 3."] },
	]);
});

test("un hecho añadido no marca nada; sin cambios no hay lista", () => {
	const despues = memory(3, [...[["carta", "Elena recibe la carta"], ["anillo", "El anillo es falso"]], ["daga", "Hay una daga"]], []);
	const changes = factChanges(ANTES.hechos, despues.hechos);
	assert.deepEqual(changes, [{ hecho: "daga", cambio: "añadido" }]);
	assert.deepEqual(staleFrom(buildFactGraph([despues, ...LATER]), 3, changes), []);
	assert.deepEqual(factChanges(ANTES.hechos, ANTES.hechos), []);
});

test("si otro capítulo vuelve a introducir el hecho antes del uso, ese uso no queda desactualizado", () => {
	const despues = memory(3, [["anillo", "El anillo es falso"]], []);
	const reintroduce = memory(12, [["carta", "Llega otra carta"]], []);
	const changes = factChanges(ANTES.hechos, despues.hechos);
	const stale = staleFrom(buildFactGraph([despues, reintroduce, ...LATER]), 3, changes);
	assert.deepEqual(stale.map((entry) => entry.capitulo), [9]);
});

test("reanalizar en orden: solo el capítulo más antiguo se limpia, y solo al confirmarlo", () => {
	const list = mergeStale(
		[{ capitulo: 14, motivos: ["a"] }],
		[
			{ capitulo: 9, motivos: ["b"] },
			{ capitulo: 14, motivos: ["a", "c"] },
		],
	);
	assert.deepEqual(list, [
		{ capitulo: 9, motivos: ["b"] },
		{ capitulo: 14, motivos: ["a", "c"] },
	]);
	assert.throws(() => confirmReanalysis(list, 14), /Reanaliza antes el cap\. 9/);
	const after = confirmReanalysis(list, 9);
	assert.deepEqual(after, [{ capitulo: 14, motivos: ["a", "c"] }]);
	assert.deepEqual(confirmReanalysis(after, 14), []);
	assert.throws(() => confirmReanalysis([], 3), /No hay capítulos desactualizados/);
});

test("el almacén vacío o ausente arranca sin base ni lista", () => {
	assert.deepEqual(parseStore(null), { base: {}, stale: {} });
	assert.deepEqual(parseStore('{"stale":{"N/_Memoria":[{"capitulo":9,"motivos":["x"]}]}}'), {
		base: {},
		stale: { "N/_Memoria": [{ capitulo: 9, motivos: ["x"] }] },
	});
});
