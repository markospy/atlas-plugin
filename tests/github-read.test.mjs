import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = ".claude/bin/super-board-github-read.py";

// Runs the helper with a fake `gh` that logs each call and prints `[[]]`.
function run(args) {
	const dir = mkdtempSync(join(tmpdir(), "gh-read-"));
	const log = join(dir, "calls.log");
	const gh = join(dir, "gh");
	writeFileSync(gh, `#!/bin/sh\necho call >> "${log}"\necho '[[]]'\n`);
	chmodSync(gh, 0o755);
	const halt = join(dir, "halt.json");
	const r = spawnSync("python3", ["-I", SCRIPT, ...args], {
		encoding: "utf8",
		env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, SB_GITHUB_HALT_FILE: halt, SB_GITHUB_RETRY_DELAY: "0" },
	});
	return { r, halted: existsSync(halt), calls: existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean).length : 0 };
}

const COMMENTS = ["api", "repos/o/r/issues/1/comments", "--paginate", "--slurp"];

for (const flag of [["--jq", "."], ["--jq=."], ["-q", "."], ["--template", "{{.}}"], ["-t", "{{.}}"]]) {
	test(`--slurp con ${flag[0]} sale con 64 sin halt ni llamada a gh`, () => {
		const { r, halted, calls } = run(["--kind", "json", "--", ...COMMENTS, ...flag]);
		assert.equal(r.status, 64, r.stderr);
		assert.equal(halted, false);
		assert.equal(calls, 0);
		assert.match(r.stderr, /--kind comments -- api repos\/\{owner\}\/\{repo\}\/issues\/<N>\/comments --paginate --slurp/);
	});
}

test("una lectura valida de comentarios con --slurp sigue funcionando", () => {
	const { r, halted, calls } = run(["--kind", "comments", "--", ...COMMENTS]);
	assert.equal(r.status, 0, r.stderr);
	assert.equal(r.stdout.trim(), "[[]]");
	assert.equal(halted, false);
	assert.equal(calls, 1);
});

test("--jq sin --slurp sigue permitido", () => {
	const { r } = run(["--kind", "json", "--", "api", "repos/o/r/issues/1", "--jq", "."]);
	assert.equal(r.status, 0, r.stderr);
});

test("a diff line holding \\x0b or \\r is one line, not two", () => {
	const diff = "diff --git a/x.txt b/x.txt\n--- a/x.txt\n+++ b/x.txt\n@@ -0,0 +1,2 @@\n+a\x0bb\n+c\rd\n";
	const code = `import importlib.util,sys
s=importlib.util.spec_from_file_location('r','${SCRIPT}');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
m.validate(sys.stdin.read(),'diff',{'files':[{'path':'x.txt'}],'additions':2,'deletions':0})`;
	const r = spawnSync("python3", ["-I", "-c", code], { input: diff, encoding: "utf8" });
	assert.equal(r.status, 0, r.stderr);
});
