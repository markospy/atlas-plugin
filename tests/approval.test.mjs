import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const SCRIPT = ".claude/bin/super-board-approval.py";
const HEAD = "a".repeat(40);

// Run GitHub.pr() against a canned GraphQL page; returns [head, sorted issues].
function prIssues({ base, body, linked = [] }) {
	const page = {
		data: { repository: {
			defaultBranchRef: { name: "main" },
			pullRequest: {
				headRefOid: HEAD, state: "OPEN", baseRefName: base, body,
				closingIssuesReferences: {
					pageInfo: { hasNextPage: false, endCursor: null },
					nodes: linked.map((number) => ({ number, repository: { nameWithOwner: "o/r" } })),
				},
			},
		} },
	};
	const code = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("approval", ${JSON.stringify(SCRIPT)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.GitHub.read = staticmethod(lambda *a: [json.loads(sys.argv[1])])
head, issues = m.GitHub("o/r").pr(5)
print(json.dumps([head, sorted(issues)]))`;
	const r = spawnSync("python3", ["-I", "-c", code, JSON.stringify(page)], { encoding: "utf8" });
	assert.equal(r.status, 0, r.stderr);
	return JSON.parse(r.stdout);
}

test("PR contra staging con Closes #N cuenta el issue como vinculado", () => {
	assert.deepEqual(prIssues({ base: "staging", body: "Closes #46\n" }), [HEAD, [46]]);
});

test("PR contra staging que no nombra el issue no lo vincula", () => {
	assert.deepEqual(prIssues({ base: "staging", body: "Refs #46, closes nothing" }), [HEAD, []]);
});

test("repo ajeno en la palabra clave se ignora", () => {
	assert.deepEqual(prIssues({ base: "staging", body: "Fixes other/repo#46" }), [HEAD, []]);
});

test("contra la rama por defecto solo cuenta el enlace de GitHub", () => {
	assert.deepEqual(prIssues({ base: "main", body: "Closes #46", linked: [7] }), [HEAD, [7]]);
});

// check(answered=True) en la ruta del planner (#55): el head se movió tras el `done`.
function answeredAfterRebuild(withDone) {
	const OLD = "b".repeat(40);
	const user = { login: "owner", type: "User" };
	const request = { repo: "o/r", pr: 5, head: OLD, scope: "c".repeat(64) };
	const comments = [{
		id: 1, user, created_at: "2026-11-14T10:00:00Z", updated_at: "2026-11-14T10:00:00Z",
		body: "Reason tag: 🙋 needs you\napproval-request: " + JSON.stringify(request) + "\nblocked-by: -",
	}];
	if (withDone) comments.push({ id: 2, user, body: "done",
		created_at: "2026-11-14T11:00:00Z", updated_at: "2026-11-14T11:00:00Z" });
	const code = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("approval", ${JSON.stringify(SCRIPT)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
gh = m.GitHub("o/r")
gh.pr = lambda n: (${JSON.stringify(HEAD)}, {55})
gh.comments = lambda n: [dict(c, source=n) for c in json.loads(sys.argv[1]) if n == 55]
gh.permission = lambda login: "admin"
print(json.dumps(gh.check(5, head=${JSON.stringify(OLD)}, issue=55, answered=True)))`;
	const r = spawnSync("python3", ["-I", "-c", code, JSON.stringify(comments)], { encoding: "utf8" });
	assert.equal(r.status, 0, r.stderr);
	return JSON.parse(r.stdout);
}

test("head nuevo tras un done verificado: answered sin aprobar el head nuevo", () => {
	const out = answeredAfterRebuild(true);
	assert.equal(out.approved, false);
	assert.equal(out.headChanged, true);
	assert.equal(out.answered, true);
});

test("head nuevo sin ningún done: answered sigue en false", () => {
	const out = answeredAfterRebuild(false);
	assert.equal(out.headChanged, true);
	assert.equal(out.answered, false);
});
