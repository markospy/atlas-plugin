import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const REF = ".claude/skills/super-board/references";
const standard = readFileSync(`${REF}/writing-standard.md`, "utf8");
const HEADER = /^\[(builder|qa|reviewer|collect|orchestrator)\] \[(blocker|issue|suggestion|nit|question|praise|report)\] \S/;

// La sección "6 · Idioma" del estándar de escritura.
const languageSection = () => {
	const start = standard.indexOf("## 6 · Language");
	assert.notEqual(start, -1, "writing-standard.md no tiene la sección 6 · Language");
	const end = standard.indexOf("\n## ", start + 1);
	return standard.slice(start, end === -1 ? undefined : end);
};

// El bloque de código que sigue a `<!-- lang-es:<name> -->` dentro de la sección.
const example = (name) => {
	const section = languageSection();
	const at = section.indexOf(`<!-- lang-es:${name} -->`);
	assert.notEqual(at, -1, `falta el ejemplo lang-es:${name}`);
	const open = section.indexOf("```", at);
	const body = section.indexOf("\n", open) + 1;
	return section.slice(body, section.indexOf("```", body)).trimEnd();
};

const deps = (comments, labels = []) => {
	const dir = mkdtempSync(join(tmpdir(), "sb-lang-"));
	const payload = join(dir, "issues.json");
	writeFileSync(payload, JSON.stringify([{
		number: 99,
		title: "tarjeta de prueba",
		state: "OPEN",
		body: "## Blocked by\n- None.\n",
		labels: { nodes: labels.map((name) => ({ name })) },
		comments: { nodes: comments.map((body) => ({ body })) },
	}]));
	const out = execFileSync("bash", [".claude/bin/super-board-deps.sh", "--from", payload], { encoding: "utf8" });
	return JSON.parse(out)["99"];
};

const approvalBlockMatches = (body) => {
	const script = [
		"import importlib.util, sys",
		"spec = importlib.util.spec_from_file_location('approval', '.claude/bin/super-board-approval.py')",
		"m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
		"print('yes' if m.BLOCK.search(sys.stdin.read()) else 'no')",
	].join("\n");
	return execFileSync("python3", ["-c", script], { input: body, encoding: "utf8" }).trim() === "yes";
};

test("el estándar define la clave language y los tokens que nunca se traducen", () => {
	const section = languageSection();
	assert.match(section, /`language`/);
	for (const token of ["[role] [label]", "Reason tag:", "blocked-by:", "approval-request:", "Local tests:", "done"]) {
		assert.ok(section.includes(token), `la sección no protege ${token}`);
	}
});

test("el informe de lane en español conserva la cabecera que leen las lanes", () => {
	const report = example("report");
	assert.match(report.split("\n")[0], HEADER);
	assert.match(report, /^Hecho: /m);
	assert.match(report, /^Siguiente: (builder|qa|reviewer|Eric|none)$/m);
	assert.match(report, /^Local tests: /m);
});

test("super-board-deps.sh lee blocked-by: de un bloqueo escrito en español", () => {
	const block = example("block");
	assert.match(block.split("\n")[0], HEADER);
	assert.match(block.split("\n").at(-1), /^blocked-by: /);
	const entry = deps([block.replace(/^blocked-by: .*$/m, "blocked-by: 32, 41")]);
	assert.equal(entry.parseable, true);
	assert.deepEqual(entry.blockers, [32, 41]);
	assert.equal(entry.needsYou, false);
});

test("el 🙋 en español sigue marcando needsYou para deps.sh y approval.py", () => {
	const needsYou = example("needs-you");
	assert.match(needsYou, /^Reason tag: 🙋/m);
	assert.match(needsYou, /^approval-request: /m);
	assert.match(needsYou, /`done`/);
	const entry = deps([needsYou]);
	assert.equal(entry.needsYou, true);
	assert.equal(entry.humanGated, true);
	assert.ok(approvalBlockMatches(needsYou));
});

test("sin la clave language las plantillas siguen en inglés", () => {
	assert.match(languageSection(), /Absent → English/);
	const schema = readFileSync(`${REF}/config-schema.json`, "utf8");
	assert.match(schema, /"language": null/);
	const wave = readFileSync(".claude/workflows/super-board-wave.js", "utf8");
	assert.match(wave, /const LANGUAGE =\s/);
	assert.match(wave, /LANGUAGE,\n\s*`Return one verdict per issue/);
	assert.match(wave, /BOARD_IO\(\),\n\s*LANGUAGE,/);
});
