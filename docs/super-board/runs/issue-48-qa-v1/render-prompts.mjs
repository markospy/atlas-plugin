// Evidencia QA #48: ejecuta super-board-wave.js con agentes falsos y dice qué prompts llevan la línea Language.
import { readFileSync } from "node:fs";
const [file, config] = process.argv.slice(2);
const src = readFileSync(file, "utf8").replace(/^export const meta/m, "const meta");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const seen = [];
const agent = async (prompt, opts) => {
  seen.push({ label: opts.label, hasLanguage: /^Language: read "language" in /m.test(prompt), line: prompt.split("\n").find((l) => l.startsWith("Language:")) });
  if (opts.phase === "Pre-flight") return { verdicts: [{ number: 1, verdict: "proceed", detail: "ok" }] };
  if (opts.phase === "Classify") return { kind: "bug", complexity: "low" };
  return { status: "advanced", column: "Done", detail: "stub" };
};
const pipeline = async (items, ...stages) => { const out = []; for (const it of items) { let v; for (const s of stages) v = await s(v === undefined ? it : v, it); out.push(v); } return out; };
const args = { configPath: config, cards: [
  { number: 1, status: "Ready", title: "b", lane: "build", labels: ["bug"] },
  { number: 2, status: "QA", title: "q", lane: "qa", labels: ["bug"] },
  { number: 3, status: "Review", title: "r", lane: "review", labels: [] },
] };
try { await new AsyncFunction("args", "agent", "pipeline", "log", src)(args, agent, pipeline, () => {}); } catch (e) { console.log("run error:", e.message); }
for (const s of seen) console.log(`${s.label}\tlanguage=${s.hasLanguage}`);
console.log(seen.find((s) => s.line)?.line);
