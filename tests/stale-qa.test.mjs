import assert from "node:assert/strict";
import test from "node:test";

import { buildFactGraph } from "../src/dependencies.ts";
import { confirmReanalysis, factChanges, mergeStale, staleFrom } from "../src/stale.ts";

// QA #21: huecos del test-gap check. Memorias armadas a mano, sin parsear YAML.
const fact = (id, texto, verdad = null) => ({ id, texto, verdad });
const memory = (capitulo, hechos, usos) => ({
	capitulo,
	hechos,
	conocimiento: [],
	usos: usos.map((hecho) => ({ hecho, quien: "[[Elena]]", modo: "menciona" })),
});

test("cambiar solo la verdad de un hecho cuenta como cambiado y marca a quien lo usa", () => {
	const changes = factChanges([fact("anillo", "El anillo", true)], [fact("anillo", "El anillo", false)]);
	assert.deepEqual(changes, [{ hecho: "anillo", cambio: "cambiado" }]);
	const graph = buildFactGraph([memory(3, [fact("anillo", "El anillo", false)], []), memory(8, [], ["anillo"])]);
	assert.deepEqual(staleFrom(graph, 3, changes).map((entry) => entry.capitulo), [8]);
});

test("quitar un hecho que ya introducía un capítulo anterior no marca nada", () => {
	const graph = buildFactGraph([
		memory(1, [fact("carta", "Llega la carta")], []),
		memory(3, [], []),
		memory(9, [], ["carta"]),
	]);
	assert.deepEqual(staleFrom(graph, 3, [{ hecho: "carta", cambio: "eliminado" }]), []);
});

test("un hecho cambiado y vuelto a introducir entre medias solo marca los usos previos a la reintroducción", () => {
	const graph = buildFactGraph([
		memory(3, [fact("anillo", "El anillo es auténtico")], []),
		memory(5, [], ["anillo"]),
		memory(7, [fact("anillo", "El anillo es falso")], []),
		memory(10, [], ["anillo"]),
	]);
	assert.deepEqual(staleFrom(graph, 3, [{ hecho: "anillo", cambio: "cambiado" }]).map((entry) => entry.capitulo), [5]);
});

test("un capítulo con dos hechos rotos lleva un motivo por hecho", () => {
	const changes = factChanges([fact("carta", "c"), fact("daga", "d")], []);
	const graph = buildFactGraph([memory(3, [], []), memory(9, [], ["carta", "daga"])]);
	assert.deepEqual(staleFrom(graph, 3, changes), [
		{
			capitulo: 9,
			motivos: [
				"El cap. 9 usa «carta», que ya no se introduce en el cap. 3.",
				"El cap. 9 usa «daga», que ya no se introduce en el cap. 3.",
			],
		},
	]);
});

test("renombrar el id de un hecho es eliminado + añadido y marca a sus usuarios", () => {
	const changes = factChanges([fact("carta", "La carta")], [fact("carta-roja", "La carta")]);
	assert.deepEqual(changes, [
		{ hecho: "carta", cambio: "eliminado" },
		{ hecho: "carta-roja", cambio: "añadido" },
	]);
	const graph = buildFactGraph([memory(3, [fact("carta-roja", "La carta")], []), memory(9, [], ["carta"])]);
	assert.deepEqual(staleFrom(graph, 3, changes).map((entry) => entry.capitulo), [9]);
});

test("el propio capítulo editado nunca se marca desactualizado", () => {
	const graph = buildFactGraph([memory(3, [], ["carta"]), memory(9, [], ["carta"])]);
	assert.deepEqual(staleFrom(graph, 3, [{ hecho: "carta", cambio: "eliminado" }]).map((entry) => entry.capitulo), [9]);
});

test("volver a propagar sin capítulos nuevos no limpia la lista: solo confirmar la limpia", () => {
	const list = [
		{ capitulo: 9, motivos: ["a"] },
		{ capitulo: 14, motivos: ["b"] },
	];
	assert.deepEqual(mergeStale(list, []), list);
	assert.deepEqual(mergeStale(list, [{ capitulo: 9, motivos: ["a"] }]), list);
	assert.deepEqual(confirmReanalysis(list, 9), [{ capitulo: 14, motivos: ["b"] }]);
	assert.deepEqual(list.length, 2, "confirmar no muta la lista original");
});
