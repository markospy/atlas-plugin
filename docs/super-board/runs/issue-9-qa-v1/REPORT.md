# QA v1 · issue #9 · world: state-at-chapter-N query

Head tested: `0abe8e5` plus the QA test commit. Non-visual ACs: pure function `worldAt` in `src/world.ts`, no UI, so there are no screenshots.

| AC | Unit proof | Result |
|---|---|---|
| AC1 relaciones vigentes en N | `tests/world.test.mjs:70` (N=2/5/10, `hasta` exclusive), `:105` (only `hasta`) | ✅ |
| AC2 poseedor de cada objeto en N | `tests/world.test.mjs:84` (N=3/8), `:105` (tie, out of order, empty holder, unparseable chapter) | ✅ |
| AC3 estado de cada lugar con cambio ≤ N | `tests/world.test.mjs:94` (N=1/9/15), `:105` (same-chapter tie) | ✅ |
| AC4 timeline de ejemplo en los tres tipos | `tests/world.test.mjs:9-68` fixtures from the real parsers | ✅ |

Component / e2e: n/a. The AC asks only for the query, and nothing in `main.ts` calls it yet.

## Test gaps
- Written: same-chapter tie (`>=` to `>` mutant now fails), out-of-order entries, empty `poseedor` dropped, `[[Epílogo]]` ignored, relation with only `hasta`.
- Not written (Low): a relation whose `desde` is after its `hasta` returns nothing. Behaviour is reasonable, and the data is invalid anyway.

## Commands
- `npm test`: 27/27 pass (`npm-test.log`)
- `npm run build`: tsc + esbuild clean
