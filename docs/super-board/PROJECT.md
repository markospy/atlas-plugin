# Atlas-plugin

Cursor/Claude plugin and skill pack: autonomous GitHub Project board tooling (`super-board`) and related agent skills.

## What this repo is

- Skills under `.claude/skills/` (super-board pipeline and helpers)
- Scripts under `.claude/bin/` (board planner, merge gate, waves)
- Local board config under `.claude/super-board/configs/`

## Base branch

Finished work merges to **staging**. Promote to `main` separately.

## Board

[Atlas-plugin board](https://github.com/users/markospy/projects/4) — Backlog → Ready → Building → QA → Review → Blocked → Done.

## Boundaries

- One card · one worktree · one branch
- Orchestrator never builds, tests, or merges product work
- Secrets stay in `.env`; agents use key-name checks only
