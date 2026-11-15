# QA #47 · v1 · against 075792a

Command: `npm test` (50/51 pass). Log: `npm-test.log`. Non-visual change: no screenshots.

| AC | Test | Result |
|---|---|---|
| AC1 non-trivial PR gets a truth-check by agents independent of the Reviewer | `tests/wave-truth.test.mjs` "el truth-check lo hacen dos agentes…", "qa: una tarjeta que pasa QA → Review…" | ✅ Code-grounder + Historian run before `review:` in both entry paths (Review, and QA → Review in the same wave) |
| AC2 no Reviewer reports "truth-check inline" | "el Reviewer nunca hace el truth-check inline" | ✅ prompt-level: Reviewer prompt forbids it and no longer says "spawn 2 sub-agents"; not proven by a real wave run |
| AC3 truth-check that cannot run always ends 🛡 Blocked, never merged | "truth-check que no puede ejecutarse…", "qa: un agente salta…", "qa: sin confidence entera…", **"qa: resultado done sin headSha…"** | ❌ two `done` results with no `headSha` aggregate to SCORED "at head undefined" |

## Failure

- Repro: `node --test tests/wave-truth.test.mjs` → "qa: resultado done sin headSha → INCONCLUSIVE".
- Cause: `.claude/workflows/super-board-wave.js:222` checks status and confidence but not `headSha`;
  `:224` compares `undefined !== undefined` → false, so the result is `scored`. `TRUTH_SCHEMA`
  does not require `headSha`.
- Expected: a `done` result without a `headSha` string → `inconclusive` → Reviewer told MUST NOT merge.
- Actual: Reviewer gets `SCORED 90/100 … at head undefined` and "If the PR head is no longer undefined…".

## Test gaps (not written)
- Medium: AC2 is only enforced in the prompt; the wave does not flag a Reviewer whose `detail` says "inline".
- Low: an `agent()` call that throws (rather than returning null) rejects the whole wave — same as the other lanes.
