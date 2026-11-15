import assert from "node:assert/strict";
import test from "node:test";

import { checkContinuity, usageErrors } from "../src/continuity.ts";
import { memoryNote, parseMemory } from "../src/memory.ts";

const CAP_02 = parseMemory(`---
tipo: memoria
capitulo: 2
hechos:
  - id: padre
    texto: "El juez es el padre de Elena"
    verdad: true
  - id: veneno
    texto: "La copa estaba envenenada"
    verdad: true
  - id: carta
    texto: "La carta la escribió Iván"
    verdad: false
conocimiento:
  - hecho: padre
    quien: lector
    estado: ignora
  - hecho: veneno
    quien: lector
    estado: sabe
  - hecho: veneno
    quien: "[[Elena]]"
    estado: ignora
  - hecho: carta
    quien: "[[Elena]]"
    estado: cree-falso
---
`);

const CAP_05 = parseMemory(`---
tipo: memoria
capitulo: 5
hechos: []
conocimiento:
  - hecho: veneno
    quien: "[[Elena]]"
    estado: ignora
usos:
  - hecho: padre
    quien: "[[Iván]]"
    modo: menciona
  - hecho: veneno
    quien: "[[Iván]]"
    modo: actua
---
`);

test("parseMemory reads usos", () => {
	assert.deepEqual(CAP_05.usos, [
		{ hecho: "padre", quien: "[[Iván]]", modo: "menciona" },
		{ hecho: "veneno", quien: "[[Iván]]", modo: "actua" },
	]);
	assert.deepEqual(parseMemory(memoryNote(1)).usos, []);
});

test("a mention of a fact the reader ignores is a possible spoiler", () => {
	const alerts = checkContinuity([CAP_02, CAP_05], 5);
	const spoiler = alerts.filter((alert) => alert.tipo === "spoiler");
	assert.equal(spoiler.length, 1);
	assert.equal(spoiler[0].hecho, "padre");
	assert.equal(spoiler[0].quien, "[[Iván]]");
	assert.equal(spoiler[0].error, true);
	assert.match(spoiler[0].mensaje, /lector aún ignora/);
});

test("no spoiler once the reader knows the fact", () => {
	const told = parseMemory(`---
capitulo: 4
conocimiento:
  - hecho: padre
    quien: lector
    estado: sabe
---
`);
	const alerts = checkContinuity([CAP_02, told, CAP_05], 5);
	assert.equal(alerts.filter((alert) => alert.tipo === "spoiler").length, 0);
});

test("an action that needs a fact the character does not know is omniscient", () => {
	const alerts = checkContinuity([CAP_02, CAP_05], 5);
	const omniscient = alerts.filter((alert) => alert.tipo === "omnisciente");
	assert.equal(omniscient.length, 1);
	assert.equal(omniscient[0].hecho, "veneno");
	assert.equal(omniscient[0].quien, "[[Iván]]");
	assert.equal(omniscient[0].error, true);
});

test("an action on a false belief is respected, not omniscient", () => {
	const acts = parseMemory(`---
capitulo: 6
usos:
  - hecho: carta
    quien: "[[Elena]]"
    modo: actua
---
`);
	const alerts = checkContinuity([CAP_02, acts], 6).filter((alert) => alert.hecho === "carta");
	assert.deepEqual(alerts, []);
});

test("an unknown modo is reported instead of ignored", () => {
	const typo = parseMemory(`---
capitulo: 6
usos:
  - hecho: veneno
    quien: "[[Iván]]"
    modo: actúa
---
`);
	assert.deepEqual(usageErrors(typo), [
		"Modo «actúa» no válido para veneno: usa menciona o actua.",
	]);
	assert.deepEqual(usageErrors(CAP_05), []);
});

test("an aliased link and a plain name give one irony alert", () => {
	const both = parseMemory(`---
capitulo: 5
conocimiento:
  - hecho: veneno
    quien: "[[Elena|E]]"
    estado: ignora
usos:
  - hecho: padre
    quien: Elena
    modo: actua
---
`);
	const irony = checkContinuity([CAP_02, both], 5).filter((alert) => alert.tipo === "ironia");
	assert.equal(irony.length, 1);
});

test("reader knows and character does not is irony, not an error", () => {
	const alerts = checkContinuity([CAP_02, CAP_05], 5);
	const irony = alerts.filter((alert) => alert.tipo === "ironia");
	assert.equal(irony.length, 1);
	assert.equal(irony[0].hecho, "veneno");
	assert.equal(irony[0].quien, "[[Elena]]");
	assert.equal(irony[0].error, false);
});

test("a character acting on what they know raises nothing", () => {
	const knows = parseMemory(`---
capitulo: 5
conocimiento:
  - hecho: veneno
    quien: "[[Iván]]"
    estado: sabe
  - hecho: padre
    quien: lector
    estado: sabe
usos:
  - hecho: veneno
    quien: "[[Iván]]"
    modo: actua
  - hecho: padre
    quien: "[[Iván]]"
    modo: menciona
---
`);
	assert.deepEqual(checkContinuity([CAP_02, knows], 5), []);
});

test("only the chapter under review is checked", () => {
	assert.deepEqual(
		checkContinuity([CAP_02, CAP_05], 4).filter((alert) => alert.tipo !== "ironia"),
		[],
	);
});
