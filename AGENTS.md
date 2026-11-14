# Atlas-plugin

Cursor/Claude plugin pack and board tooling for this repo.

## Commands

| Command | What |
|---|---|
| `/super-board status` | Board snapshot |
| `/super-board lint` | Ticket readiness |
| `/super-board run` | Drain the board |

## Where things live

| Path | What |
|---|---|
| `.claude/skills/` | Agent skills |
| `.claude/bin/` | super-board scripts |
| `.claude/super-board/configs/` | Board configs |
| `docs/agents/` | Agent docs (ticket format, …) |

## Conventions

- Prefer smallest safe change; test before merge when tests exist.
- Keep board cards one PR each, under 400 changed lines.

## Boundaries

**Always**
- Work one card · one worktree · one branch
- Use merge gate for merges

**Ask first**
- Secrets, production deploys, destructive schema

**Never**
- NEVER force-push shared history
- NEVER read `.env` contents into chat
- NEVER build/test/merge from the orchestrator session

<!-- super-board:begin v3.1.2 (managed; edits inside are overwritten on upgrade) -->
## Super Board

Board: Backlog · Ready · Building · QA · Review · Blocked · Done. Labels route: `qa` skips Building · `bug`, `feature`, none → built first.

| When | Use | NEVER |
|---|---|---|
| Set up / repair the board | `/super-board onboard` | DON'T hand-edit config mid-run |
| Check tickets before a run | `/super-board lint` | NEVER run with AC-less tickets |
| Drain the board | `/super-board run` | NEVER build, test or merge from the orchestrator |
| Board state / halt | `/super-board status` · `/super-board stop` | |
| Build one ticket | `/super-build` | NEVER build outside the card's worktree |
| QA a branch, or a live URL alone | `/super-qa` · `/super-qa <url>` | NEVER mark QA pass without evidence |
| Review a PR, merge | `/super-review` | NEVER `gh pr merge` direct — merge gate only |
| File bugs from Sentry, PostHog, PRs | `/super-collect` | DON'T file without a verifier pass |
| UI polish | `/ui-refine-loop` (human runs it) | board NEVER runs it |
| Diagram / explainer page | `/visual` | |
| Commit, pull, push this branch | `/git-sync` | NEVER force push or rebase shared history |

| Rule | Value |
|---|---|
| Config | `.claude/super-board/configs/<slug>.json` |
| Isolation | 1 card · 1 worktree · 1 branch |
| Merge | auto for normal changes · money, auth, destructive schema (DROP/TRUNCATE/RENAME) → human · PR > 400 changed lines → human |
| Migrations | additive → robot migrates allowed DBs only · live DB ALWAYS → 🙋 needs you |
| Blocked card | block-template comment · last line `blocked-by:` · 🙋 = needs you |
| Secrets | NEVER read `.env`; key names via `.claude/bin/super-board-env-check.sh` |

## Writing (super-board)

| Thing | Format → `.claude/skills/super-board/references/writing-standard.md` |
|---|---|
| Commit, PR title | `<emoji> [type] scope: subject` + short bullets · ✨ feat 🐛 fix 🔧 chore ♻️ refactor 🧪 test 📝 docs |
| PR body | blocks: status · Problem · Solution · AC + proof · history · Before\|After · Risk — `super-board-pr-body.sh` |
| Ticket | Problem · Context · Fix · AC · Risk · Blocked by → `docs/agents/issue-tracker.md` |
| Comment | `[role] [label] status` · Did · ✅ Done · ❌ Not done · Next · ≤ 8 lines |
| PR author notes | file + critical inline review comments: Purpose · What changed · Why it matters → `pr-author-notes.md` |

- Idioma: escribe en español todo lo que lee el humano — chat, tickets, comentarios del board, cuerpos de PR. Mantén en su forma original los nombres de código, comandos, etiquetas (`[role] [label]`, `blocked-by:`) y los tipos de commit.
- NEVER chain steps with arrows. One step per line, lettered under Where.
- NEVER link screenshots. Embed a raw URL pinned to a sha.
- DON'T repeat file lists in status comments. DON'T write "Not verified" or "Next" in a PR body.
<!-- super-board:end -->
