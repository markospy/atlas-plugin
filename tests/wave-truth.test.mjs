import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Runs .claude/workflows/super-board-wave.js with a fake `agent` (issue #47):
// the truth-check is a wave phase of its own, never the Reviewer's job.
const SOURCE = (await readFile(".claude/workflows/super-board-wave.js", "utf8")).replace(
	"export const meta",
	"const meta",
);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const wave = new AsyncFunction("args", "agent", "pipeline", "log", SOURCE);

const pipeline = (items, first, second) =>
	Promise.all(items.map(async (item) => second(await first(item), item)));

const runWave = async (truthReplies, reviewReply = { status: "blocked", column: "Blocked", detail: "x" }) => {
	const calls = [];
	const agent = async (prompt, opts) => {
		calls.push({ prompt, ...opts });
		if (opts.label.startsWith("truth:Code-grounder")) return truthReplies[0];
		if (opts.label.startsWith("truth:Historian")) return truthReplies[1];
		if (opts.label.startsWith("review:")) return reviewReply;
		throw new Error(`unexpected agent ${opts.label}`);
	};
	const args = {
		configPath: ".claude/super-board/configs/atlas-plugin.json",
		cards: [{ number: 7, status: "Review", title: "t", lane: "review", labels: [] }],
	};
	const out = await wave(args, agent, pipeline, () => {});
	const review = calls.find((c) => c.label.startsWith("review:"));
	return { out, calls, review };
};

const done = (confidence, headSha = "abc1234") => ({ status: "done", pr: 44, headSha, confidence, findings: [], detail: "ok" });

test("el truth-check lo hacen dos agentes del workflow antes del Reviewer", async () => {
	const { calls, review } = await runWave([done(90), done(80)]);
	const labels = calls.map((c) => c.label);
	assert.deepEqual(labels.slice(0, 2).sort(), ["truth:Code-grounder:#7", "truth:Historian:#7"]);
	assert.equal(labels[2], "review:#7");
	assert.equal(calls[0].phase, "Truth-check");
	assert.match(review.prompt, /SCORED 80\/100/);
	assert.match(review.prompt, /abc1234/);
});

test("el Reviewer nunca hace el truth-check inline", async () => {
	const { review } = await runWave([done(90), done(90)]);
	assert.match(review.prompt, /NEVER run it yourself or inline/);
	assert.doesNotMatch(review.prompt, /spawn 2 sub-agents/);
});

test("truth-check que no puede ejecutarse obliga a 🛡 Blocked", async () => {
	for (const replies of [
		[done(90), { status: "insufficient_data", detail: "budget" }],
		[done(90), null],
		[done(90, "aaa"), done(90, "bbb")],
	]) {
		const { review } = await runWave(replies);
		assert.match(review.prompt, /INCONCLUSIVE/);
		assert.match(review.prompt, /MUST NOT merge/);
		assert.match(review.prompt, /🛡 truth-check inconclusive/);
	}
});

test("un Reviewer que avanza con truth-check inconcluso queda como failed", async () => {
	const { out } = await runWave(
		[null, null],
		{ status: "advanced", column: "Done", detail: "merged" },
	);
	assert.equal(out.cards[0].finalStatus, "failed");
	assert.match(out.cards[0].detail, /inconclusive truth-check/);
});

test("truth_gate sin disparar pasa SKIPPED al Reviewer", async () => {
	const skipped = { status: "skipped", detail: "3 líneas" };
	const { review, out } = await runWave([skipped, skipped]);
	assert.match(review.prompt, /SKIPPED/);
	assert.match(out.cards[0].lanesRun, /truth:skipped → review:blocked/);
});

test("halted en el truth-check detiene la wave sin Reviewer", async () => {
	const { calls, out } = await runWave([{ status: "halted", detail: "79" }, done(90)]);
	assert.equal(calls.some((c) => c.label.startsWith("review:")), false);
	assert.equal(out.halted, true);
	assert.equal(out.cards[0].finalStatus, "halted");
});
