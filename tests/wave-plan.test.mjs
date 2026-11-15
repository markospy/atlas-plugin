import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// Una tarjeta con un 🙋 viejo: deps.sh lee `blocked-by: -` y la marca humanGated.
const gated = (needsYouDone) => ({
	number: 6, title: "tarjeta aprobada", state: "OPEN",
	blockers: [], openBlockers: [], parseable: true,
	humanGated: true, runnable: false, why: "",
	needsYou: true, needsYouDone, approvalRefresh: false,
});

const plan = (status, dep) => {
	const dir = mkdtempSync(join(tmpdir(), "sb-plan-"));
	const write = (name, value) => {
		const path = join(dir, name);
		writeFileSync(path, JSON.stringify(value));
		return path;
	};
	const config = write("config.json", { project: { owner: "o", number: 1 }, repo: { path: dir } });
	const items = write("items.json", { items: [{
		status,
		labels: [],
		content: { type: "Issue", number: 6, title: "tarjeta aprobada", assignees: [] },
	}] });
	const deps = write("deps.json", { 6: dep });
	const out = execFileSync("bash", [".claude/bin/super-board-wave-plan.sh",
		"--config", config, "--items", items, "--deps", deps], {
		encoding: "utf8",
		env: { ...process.env, SB_GITHUB_HALT_FILE: join(dir, "halt.json") },
	});
	return JSON.parse(out);
};

test("una tarjeta con 🙋 + done verificado que rebota a Ready entra en cards", () => {
	const out = plan("Ready", gated(true));
	assert.deepEqual(out.cards.map((c) => c.number), [6]);
	assert.equal(out.cards[0].lane, "build");
});

test("una tarjeta con 🙋 sin done sigue con humanGated y fuera de cards", () => {
	const dir = mkdtempSync(join(tmpdir(), "sb-deps-"));
	const payload = join(dir, "issues.json");
	writeFileSync(payload, JSON.stringify([{
		number: 6, title: "tarjeta aprobada", state: "OPEN",
		body: "## Blocked by\n- None.\n",
		labels: { nodes: [] },
		comments: { nodes: [{ body: "[reviewer] [blocker] 🛑 bloqueada\nReason tag: 🙋 needs you\nblocked-by: -" }] },
	}]));
	const dep = JSON.parse(execFileSync("bash", [".claude/bin/super-board-deps.sh", "--from", payload], { encoding: "utf8" }))["6"];
	assert.equal(dep.humanGated, true);
	assert.equal(dep.needsYouDone, false);
	assert.deepEqual(plan("Ready", dep).cards, []);
});

test("en Blocked, el done verificado va por resume y nunca por sweep", () => {
	const out = plan("Blocked", gated(true));
	assert.deepEqual(out.resume.map((c) => c.number), [6]);
	assert.deepEqual(out.sweep, []);
});

test("un 🙋 aprobado no libera una tarjeta con un bloqueante abierto", () => {
	const out = plan("Ready", { ...gated(true), blockers: [3], openBlockers: [3] });
	assert.deepEqual(out.cards, []);
});

// QA v1 (#55): el segundo atasco real de #6. El dueño dijo done sobre `4a33a73`;
// el builder hizo rebase (`6295a17`) y el Reviewer la rebotó a Ready por R5 con el
// head ya en `4e98053`. approval.py ve headChanged: needsYouDone=false y
// approvalRefresh=true. Ningún humano tiene nada pendiente (el merge gate pedirá
// otra aprobación para el head nuevo), pero el `-` viejo la deja fuera para siempre.
test("una tarjeta aprobada, reconstruida y rebotada otra vez a Ready entra en cards", () => {
	const out = plan("Ready", { ...gated(false), approvalRefresh: true });
	assert.deepEqual(out.cards.map((c) => c.number), [6]);
});
