# Run 2026-11-14 · atlas-plugin

| Card | Lanes | Estado | Columna | Detalle |
|---|---|---|---|---|
| #5 | build:blocked | blocked | Blocked | worktree imposible: `.claude/worktrees` y `.claude/super-board/cache` son de root |
| #6 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #8 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #10 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #13 | build:failed | failed | Ready | worktree imposible (carpetas de root); sin código, rama local borrada |
| #6 | build → qa → review:bounced | bounced | Ready | review limpio; conflicto con staging (README.md, src/main.ts) → loop:rebase · PR #38 |
| #8 | build → qa → review:bounced | bounced | Ready | loop:rebuild-1: wikilink con ruta duplica nodo; lee Personajes/ de todo el vault · PR #36 |
| #10 | build → qa → review:human-gate | human-gate | Blocked | 420 líneas > 400 → merge humano · PR #35 |
| #13 | build → qa → review | advanced | Done | mergeado 0a355b5 en staging · PR #37 |
| #5 | build → qa → review | advanced | Done | mergeado 68de578 en staging · PR #41 |
| #6 | build → qa → review:human-gate | human-gate | Blocked | 443 líneas > 400 → merge humano · PR #38 |
| #8 | build → qa → review:bounced | bounced | Ready | loop:rebuild-2: R3 chapterNumber; conflicto tests/obsidian.md · PR #36 |
| #14 | build → qa → review:bounced | bounced | Ready | loop:rebuild-1: `---` marcado como raya; gerundios cortos · PR #42 |
| #39 | preflight:blocked | blocked | Blocked | en secuencia tras #10, #6 |
| #40 | preflight:blocked | blocked | Blocked | en secuencia tras #10, #39 |
| #7 | build → qa → review:bounced | bounced | Ready | loop:rebuild-1: alias en YAML de bloque no detectados; alias con coma · PR #44 |
| #8 | build → qa → review:human-gate | human-gate | Blocked | 779 líneas > 400 → merge humano; conflicto con staging · PR #36 |
| #9 | build → qa → review | advanced | Done | mergeado d9b7521 en staging · PR #43 |
| #14 | build → qa → review:human-gate | human-gate | Blocked | 614 líneas > 400 → merge humano · PR #42 |

🛑 run parada tras la wave 4 — block-rate 6/17 (35 %) > 30 %
| #7 | build → qa → review:blocked | blocked | Blocked | 🛡 truth-check sin sub-agentes en el lane (752 líneas) · PR #44 |
| #7 | merge humano | advanced | Done | PR #44 mergeada por el dueño · aa65deb en staging |
